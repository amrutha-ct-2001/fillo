from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Role
from points.models import Settings

from .models import Station

User = get_user_model()


class StationsApiTests(TestCase):
    def setUp(self):
        Settings.get_solo()
        self.client = APIClient()
        self.admin = User.objects.create(phone='9999999999', username='admin', role=Role.ADMIN)
        self.central = Station.objects.create(name='Central', city='Bengaluru')

    def test_admin_creates_and_edits_station(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post('/api/stations/', {'name': 'Highway', 'city': 'Hyderabad'})
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.patch(f"/api/stations/{r.data['id']}/", {'is_active': False}, format='json')
        self.assertFalse(r.data['is_active'])

        customer = User.objects.create(phone='7000000001', role=Role.CUSTOMER)
        self.client.force_authenticate(customer)
        self.assertEqual([s['name'] for s in self.client.get('/api/stations/').data], ['Central'])
        self.assertEqual(self.client.post('/api/stations/', {'name': 'X'}).status_code, 403)

    def test_staff_assignment_and_fill_records_station(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(
            '/api/auth/staff/',
            {'username': 'ravi', 'pin': '4321', 'name': 'Ravi', 'station_id': self.central.pk},
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['station_name'], 'Central')
        bad = self.client.patch(
            f"/api/auth/staff/{r.data['id']}/", {'station_id': 999}, format='json'
        )
        self.assertEqual(bad.status_code, 400)

        staff = User.objects.get(username='ravi')
        self.client.force_authenticate(staff)
        r = self.client.post(
            '/api/transactions/',
            {'plate_number': 'KA01AB1234', 'phone': '7000000002', 'amount': '500', 'payment_mode': 'CASH'},
            format='multipart',
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['station_name'], 'Central')

        self.client.force_authenticate(self.admin)
        dash = self.client.get('/api/transactions/admin/dashboard/').data
        self.assertEqual(dash['by_station'][0]['name'], 'Central')
        self.assertEqual(dash['station_count'], 1)
        self.assertEqual(dash['pending_vouchers'], 0)
