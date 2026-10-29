from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Role
from points.models import LedgerType
from points.services import add_ledger_entry, get_balance

from .models import Redemption, Reward

User = get_user_model()


class RewardsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create(phone='7000000001', role=Role.CUSTOMER, name='Anil')
        self.staff = User.objects.create(phone='8888888888', username='staff', role=Role.STAFF)
        self.admin = User.objects.create(phone='9999999999', username='admin', role=Role.ADMIN)
        add_ledger_entry(customer=self.customer, delta=150, entry_type=LedgerType.ADJUST)
        self.wash = Reward.objects.create(title='Car Wash', points_cost=100, stock=1)

    def test_customer_sees_only_active_rewards(self):
        Reward.objects.create(title='Old', points_cost=10, is_active=False)
        self.client.force_authenticate(self.customer)
        r = self.client.get('/api/rewards/')
        self.assertEqual([x['title'] for x in r.data], ['Car Wash'])

        self.client.force_authenticate(self.admin)
        self.assertEqual(len(self.client.get('/api/rewards/').data), 2)

    def test_redeem_spends_points_and_stock(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post(f'/api/rewards/{self.wash.pk}/redeem/')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['status'], 'PENDING')
        self.assertEqual(r.data['balance'], 50)
        self.wash.refresh_from_db()
        self.assertEqual(self.wash.stock, 0)

        # Out of stock now.
        r = self.client.post(f'/api/rewards/{self.wash.pk}/redeem/')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(len(self.client.get('/api/rewards/redemptions/mine/').data), 1)

    def test_not_enough_points(self):
        big = Reward.objects.create(title='Big', points_cost=1000)
        self.client.force_authenticate(self.customer)
        r = self.client.post(f'/api/rewards/{big.pk}/redeem/')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(get_balance(self.customer), 150)

    def test_staff_uses_voucher_once(self):
        self.client.force_authenticate(self.customer)
        code = self.client.post(f'/api/rewards/{self.wash.pk}/redeem/').data['code']

        self.client.force_authenticate(self.staff)
        r = self.client.get(f'/api/rewards/vouchers/{code.lower()}/')
        self.assertEqual(r.data['customer_name'], 'Anil')
        r = self.client.post(f'/api/rewards/vouchers/{code}/use/')
        self.assertEqual(r.data['status'], 'USED')
        r = self.client.post(f'/api/rewards/vouchers/{code}/use/')
        self.assertEqual(r.status_code, 400)

    def test_admin_cancel_refunds_points_and_stock(self):
        self.client.force_authenticate(self.customer)
        rid = self.client.post(f'/api/rewards/{self.wash.pk}/redeem/').data['id']

        self.client.force_authenticate(self.admin)
        r = self.client.post(f'/api/rewards/redemptions/{rid}/cancel/')
        self.assertEqual(r.data['status'], 'CANCELLED')
        self.assertEqual(get_balance(self.customer), 150)
        self.wash.refresh_from_db()
        self.assertEqual(self.wash.stock, 1)
        self.assertEqual(self.client.get('/api/rewards/redemptions/?status=cancelled').data[0]['id'], rid)

    def test_role_guards(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(f'/api/rewards/{self.wash.pk}/redeem/').status_code, 403)
        self.assertEqual(self.client.post('/api/rewards/', {'title': 'X', 'points_cost': 5}).status_code, 403)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/rewards/vouchers/ABCDEF/').status_code, 403)
        self.assertEqual(self.client.get('/api/rewards/redemptions/').status_code, 403)

    def test_admin_manages_catalog(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post('/api/rewards/', {'title': 'Coffee', 'points_cost': 30})
        self.assertEqual(r.status_code, 201, r.data)
        r = self.client.patch(f"/api/rewards/{r.data['id']}/", {'is_active': False}, format='json')
        self.assertFalse(r.data['is_active'])
        self.assertEqual(self.client.post('/api/rewards/', {'title': 'Bad', 'points_cost': 0}).status_code, 400)
        self.assertEqual(Redemption.objects.count(), 0)
