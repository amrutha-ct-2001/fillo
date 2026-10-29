"""Sending the OTP text message. Pick the provider with SMS_BACKEND."""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


class SMSError(Exception):
    pass


def send_otp(phone: str, code: str) -> None:
    backend = settings.SMS_BACKEND
    if backend == 'console':
        _send_console(phone, code)
    elif backend == 'msg91':
        _send_msg91(phone, code)
    else:
        raise SMSError(f'Unknown SMS_BACKEND {backend!r}')


def _send_console(phone: str, code: str) -> None:
    # Development only: nothing is sent, the code is printed in the server log.
    logger.warning('DEV OTP for %s is %s (SMS_BACKEND=console, nothing sent)', phone, code)


def _send_msg91(phone: str, code: str) -> None:
    # MSG91 OTP API v5. The template must be approved on MSG91 / DLT first.
    query = urllib.parse.urlencode(
        {
            'template_id': settings.MSG91_TEMPLATE_ID,
            'mobile': f'91{phone}',
            'authkey': settings.MSG91_AUTH_KEY,
            'otp': code,
        }
    )
    request = urllib.request.Request(
        f'https://control.msg91.com/api/v5/otp?{query}',
        data=b'{}',
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            body = json.loads(response.read().decode() or '{}')
    except (urllib.error.URLError, ValueError) as exc:
        logger.error('MSG91 request failed: %s', exc)
        raise SMSError('SMS provider unreachable') from exc
    if body.get('type') != 'success':
        logger.error('MSG91 rejected the OTP: %s', body)
        raise SMSError('SMS provider rejected the message')
