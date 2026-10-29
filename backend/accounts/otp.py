"""Create and check one-time login codes."""
import hmac
import secrets
from datetime import timedelta
from hashlib import sha256

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import PhoneOTP


class TooSoon(Exception):
    def __init__(self, retry_after: int):
        super().__init__('OTP requested too recently')
        self.retry_after = retry_after


def _hash(phone: str, code: str) -> str:
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, f'{phone}:{code}'.encode(), sha256).hexdigest()


def issue(phone: str) -> str:
    """Create a fresh code for this phone and return it (to be texted)."""
    now = timezone.now()
    latest = PhoneOTP.objects.filter(phone=phone).order_by('-created_at').first()
    if latest:
        wait = settings.OTP_RESEND_SECONDS - (now - latest.created_at).total_seconds()
        if wait > 0:
            raise TooSoon(int(wait) + 1)

    code = f'{secrets.randbelow(10**6):06d}'
    with transaction.atomic():
        PhoneOTP.objects.filter(created_at__lt=now - timedelta(days=1)).delete()
        PhoneOTP.objects.filter(phone=phone, used=False).update(used=True)
        PhoneOTP.objects.create(
            phone=phone,
            code_hash=_hash(phone, code),
            expires_at=now + timedelta(seconds=settings.OTP_TTL_SECONDS),
        )
    return code


def discard_latest(phone: str) -> None:
    """Forget the newest code (e.g. the SMS could not be sent) so the user can retry."""
    latest = PhoneOTP.objects.filter(phone=phone).order_by('-created_at').first()
    if latest:
        latest.delete()


def verify(phone: str, code: str) -> bool:
    """True once for the right, unexpired code; wrong guesses are capped."""
    with transaction.atomic():
        otp = (
            PhoneOTP.objects.select_for_update()
            .filter(phone=phone, used=False, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )
        if not otp:
            return False
        otp.attempts += 1
        ok = hmac.compare_digest(otp.code_hash, _hash(phone, code))
        if ok or otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp.used = True
        otp.save(update_fields=['attempts', 'used'])
        return ok
