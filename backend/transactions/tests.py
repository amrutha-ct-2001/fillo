from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import Role
from points.models import LedgerType, Settings
from points.services import add_ledger_entry, calculate_earn_points, get_balance
from transactions.models import Transaction
from vehicles.models import normalize_plate

User = get_user_model()


def _jpeg_bytes() -> bytes:
    buf = BytesIO()
    Image.new('RGB', (16, 16), (10, 20, 30)).save(buf, format='JPEG')
    return buf.getvalue()


class FilloApiTests(TestCase):
    def setUp(self):
        Settings.get_solo()
        self.client = APIClient()
        self.staff = User.objects.create(phone='8888888888', role=Role.STAFF, name='Staff')
        self.admin = User.objects.create(
            phone='9999999999', role=Role.ADMIN, name='Admin', is_staff=True, is_superuser=True
        )

    def test_normalize_plate(self):
        self.assertEqual(normalize_plate('kl 07 ab 1234'), 'KL07AB1234')

    def test_earn_points(self):
        self.assertEqual(calculate_earn_points(Decimal('500')), 5)
        self.assertEqual(calculate_earn_points(Decimal('99')), 0)

    def test_otp_and_fill_flow(self):
        self.client.force_authenticate(user=self.staff)

        r = self.client.post(
            '/api/transactions/',
            {
                'plate_number': 'KL 07 XY 9999',
                'phone': '7000000001',
                'name': 'Anil',
                'amount': '200',
                'payment_mode': 'CASH',
            },
            format='multipart',
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['points_earned'], 2)
        customer = User.objects.get(phone='7000000001')
        self.assertEqual(get_balance(customer), 2)

        self.client.force_authenticate(user=self.admin)
        dash = self.client.get('/api/transactions/admin/dashboard/')
        self.assertEqual(dash.status_code, 200)
        self.assertGreaterEqual(dash.data['today']['fills'], 1)

    def test_new_vehicle_fill_with_photo(self):
        """Vehicle + transaction both get the plate photo without FileNotFoundError."""
        self.client.force_authenticate(user=self.staff)
        photo = SimpleUploadedFile(
            'vehicle.jpg', _jpeg_bytes(), content_type='image/jpeg'
        )
        r = self.client.post(
            '/api/transactions/',
            {
                'plate_number': 'DL7CO1939',
                'phone': '7000000002',
                'name': 'Ravi',
                'amount': '500',
                'payment_mode': 'UPI',
                'vehicle_photo': photo,
            },
            format='multipart',
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data.get('id'))


class IdempotencyAndRollbackTests(TestCase):
    def setUp(self):
        Settings.get_solo()
        self.client = APIClient()
        self.staff = User.objects.create(phone='8888888888', role=Role.STAFF, name='Staff')
        self.client.force_authenticate(user=self.staff)

    def _post(self, **extra):
        body = {
            'plate_number': 'KL07AB1234',
            'phone': '7000000009',
            'amount': '300',
            'payment_mode': 'CASH',
        }
        body.update(extra)
        return self.client.post('/api/transactions/', body, format='multipart')

    def test_same_client_id_creates_one_fill(self):
        first = self._post(client_id='offline-abc12345')
        second = self._post(client_id='offline-abc12345')
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertTrue(second.data['duplicate'])
        self.assertEqual(first.data['id'], second.data['id'])
        customer = User.objects.get(phone='7000000009')
        self.assertEqual(customer.transactions.count(), 1)
        self.assertEqual(get_balance(customer), 3)

    def test_offline_fill_keeps_device_time(self):
        when = timezone.now() - timedelta(hours=10)
        r = self._post(client_id='offline-time-1', created_at=when.isoformat())
        self.assertEqual(r.status_code, 201, r.data)
        txn = Transaction.objects.get(pk=r.data['id'])
        self.assertEqual(txn.created_at, when)

    def test_implausible_device_time_is_ignored(self):
        before = timezone.now()
        future = (before + timedelta(days=2)).isoformat()
        ancient = (before - timedelta(days=90)).isoformat()
        for i, bad in enumerate([future, ancient]):
            r = self._post(client_id=f'offline-bad-time-{i}', created_at=bad)
            self.assertEqual(r.status_code, 201, r.data)
            txn = Transaction.objects.get(pk=r.data['id'])
            self.assertGreaterEqual(txn.created_at, before)

    def test_rejected_fill_leaves_no_customer_or_vehicle(self):
        r = self._post(points_to_redeem=50)  # redeem not enabled
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(phone='7000000009').exists())


class RedeemTests(TestCase):
    """1 point per ₹100, 1 point = ₹1, minimum 10, instant redeem on (the default)."""

    def setUp(self):
        s = Settings.get_solo()
        s.redeem_rate = Decimal('1.00')
        s.min_redeem_points = 10
        s.save()
        self.client = APIClient()
        self.staff = User.objects.create(phone='8888888888', role=Role.STAFF, name='Staff')
        self.client.force_authenticate(user=self.staff)

    def _customer_with(self, points):
        customer = User.objects.create(phone='7000000020', role=Role.CUSTOMER, name='Arun')
        if points:
            add_ledger_entry(customer=customer, delta=points, entry_type=LedgerType.ADJUST)
        return customer

    def _fill(self, amount, redeem, phone='7000000020'):
        return self.client.post(
            '/api/transactions/',
            {
                'plate_number': 'KL07AB1234',
                'phone': phone,
                'amount': amount,
                'payment_mode': 'CASH',
                'points_to_redeem': redeem,
            },
            format='multipart',
        )

    def test_points_from_this_fill_count_towards_redeem(self):
        customer = self._customer_with(8)
        r = self._fill('200', 10)  # 8 + 2 earned now = 10
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['points_earned'], 2)
        self.assertEqual(r.data['points_redeemed'], 10)
        self.assertEqual(get_balance(customer), 0)

    def test_new_customer_can_redeem_on_first_fill(self):
        r = self._fill('1000', 10, phone='7000000021')  # 0 + 10 earned now
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(get_balance(User.objects.get(phone='7000000021')), 0)

    def test_cannot_redeem_more_than_balance_plus_this_fill(self):
        customer = self._customer_with(7)
        r = self._fill('200', 10)  # 7 + 2 = 9
        self.assertEqual(r.status_code, 400)
        self.assertIn('Insufficient points', str(r.data))
        self.assertEqual(get_balance(customer), 7)

    def test_instant_redeem_off_uses_only_the_old_balance(self):
        s = Settings.get_solo()
        s.instant_redeem = False
        s.save()
        customer = self._customer_with(8)
        r = self._fill('200', 10)  # 8 only; this fill's 2 points wait for the next visit
        self.assertEqual(r.status_code, 400)
        self.assertIn('Insufficient points', str(r.data))
        self.assertEqual(get_balance(customer), 8)

    def test_minimum_still_applies(self):
        self._customer_with(7)
        r = self._fill('200', 9)
        self.assertEqual(r.status_code, 400)
        self.assertIn('Minimum redeem is 10 points', str(r.data))


class LoginHardeningTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.client = APIClient()
        u = User.objects.create(phone='8888888888', role=Role.STAFF, username='staff')
        u.set_pin('4821')
        u.save()

    def test_pin_login_is_throttled_per_username(self):
        codes = [
            self.client.post(
                '/api/auth/pin/login/', {'username': 'staff', 'pin': f'{i:04d}'}
            ).status_code
            for i in range(12)
        ]
        self.assertIn(429, codes)
        # Even the right PIN is refused while locked out.
        r = self.client.post('/api/auth/pin/login/', {'username': 'staff', 'pin': '4821'})
        self.assertEqual(r.status_code, 429)

    def test_unknown_and_wrong_role_look_the_same(self):
        cust = User.objects.create(phone='7000000003', role=Role.CUSTOMER, username='cust')
        a = self.client.post('/api/auth/pin/login/', {'username': 'nobody', 'pin': '1111'})
        b = self.client.post('/api/auth/pin/login/', {'username': 'cust', 'pin': '1111'})
        self.assertEqual((a.status_code, a.data), (b.status_code, b.data))
