from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts import otp as otp_service
from accounts.models import PhoneOTP, Role
from accounts.sms import SMSError

User = get_user_model()
PHONE = '9000000001'


@override_settings(OTP_MODE='sms', SMS_BACKEND='console', DEBUG=False)
class SmsOtpFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        patcher = mock.patch('accounts.views.send_otp')
        self.send = patcher.start()
        self.addCleanup(patcher.stop)

    def _request(self, phone=PHONE):
        return self.client.post('/api/auth/otp/request/', {'phone': phone})

    def _sent_code(self):
        return self.send.call_args[0][1]

    def _verify(self, otp, phone=PHONE, **extra):
        return self.client.post('/api/auth/otp/verify/', {'phone': phone, 'otp': otp, **extra})

    def test_request_sends_a_random_code_and_never_returns_it(self):
        r = self._request()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIsNone(r.data['otp_hint'])
        self.send.assert_called_once()
        code = self._sent_code()
        self.assertRegex(code, r'^\d{6}$')
        self.assertNotEqual(code, '123456')
        # Only a hash is stored.
        self.assertNotIn(code, PhoneOTP.objects.get(phone=PHONE).code_hash)

    def test_right_code_logs_in_and_works_only_once(self):
        self._request()
        code = self._sent_code()
        r = self._verify(code, name='Raju')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn('access', r.data)
        self.assertEqual(User.objects.get(phone=PHONE).name, 'Raju')
        self.assertEqual(self._verify(code).status_code, 400)  # replay refused

    def test_wrong_code_is_refused_and_creates_no_account(self):
        self._request()
        r = self._verify('000000' if self._sent_code() != '000000' else '111111')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(phone=PHONE).exists())

    def test_old_static_code_no_longer_works(self):
        self._request()
        self.assertEqual(self._verify('123456').status_code, 400)

    def test_code_expires(self):
        self._request()
        code = self._sent_code()
        PhoneOTP.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self._verify(code).status_code, 400)

    def test_code_is_burned_after_too_many_wrong_guesses(self):
        self._request()
        code = self._sent_code()
        wrong = '000000' if code != '000000' else '111111'
        with override_settings(OTP_MAX_ATTEMPTS=3):
            for _ in range(3):
                self._verify(wrong)
            # Even the right code is now refused.
            self.assertEqual(self._verify(code).status_code, 400)

    def test_resend_cooldown_and_new_code_replaces_old(self):
        self.assertEqual(self._request().status_code, 200)
        first = self._sent_code()
        r = self._request()
        self.assertEqual(r.status_code, 429)
        PhoneOTP.objects.update(created_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self._request().status_code, 200)
        second = self._sent_code()
        if first != second:
            self.assertEqual(self._verify(first).status_code, 400)
        self.assertEqual(self._verify(second).status_code, 200)

    def test_sms_failure_returns_502_and_allows_immediate_retry(self):
        self.send.side_effect = SMSError('down')
        self.assertEqual(self._request().status_code, 502)
        self.assertFalse(PhoneOTP.objects.filter(phone=PHONE).exists())
        self.send.side_effect = None
        self.assertEqual(self._request().status_code, 200)

    def test_staff_phone_gets_no_sms(self):
        User.objects.create(phone='9000000002', role=Role.STAFF, username='staff1')
        r = self._request('9000000002')
        self.assertEqual(r.status_code, 200)
        self.send.assert_not_called()
        self.assertEqual(self._verify('123456', phone='9000000002').status_code, 400)

    def test_deactivated_customer_gets_no_sms(self):
        User.objects.create(phone=PHONE, role=Role.CUSTOMER, is_active=False)
        self._request()
        self.send.assert_not_called()

    def test_sms_requests_per_phone_are_capped(self):
        codes = []
        for _ in range(7):
            PhoneOTP.objects.update(created_at=timezone.now() - timedelta(minutes=1))
            codes.append(self._request().status_code)
        self.assertIn(429, codes)
        self.assertLessEqual(self.send.call_count, 5)


@override_settings(OTP_MODE='sms', SMS_BACKEND='console', DEBUG=True)
class DevConsoleHintTests(TestCase):
    def test_debug_console_backend_returns_the_code_for_local_testing(self):
        cache.clear()
        r = APIClient().post('/api/auth/otp/request/', {'phone': PHONE})
        self.assertEqual(r.status_code, 200)
        code = r.data['otp_hint']
        self.assertTrue(otp_service.verify(PHONE, code))
