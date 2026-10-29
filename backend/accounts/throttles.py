from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class PinLoginUserThrottle(SimpleRateThrottle):
    """Limit PIN attempts per username, so a 4-digit PIN can't be brute-forced
    even from many IPs."""

    scope = 'pin_login'

    def get_cache_key(self, request, view):
        username = str(request.data.get('username', '')).strip().lower()
        if not username:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': username}


class PinLoginIpThrottle(AnonRateThrottle):
    scope = 'pin_login_ip'


class OTPRequestThrottle(AnonRateThrottle):
    scope = 'otp_request'


class OTPVerifyPhoneThrottle(SimpleRateThrottle):
    scope = 'otp_verify'

    def get_cache_key(self, request, view):
        phone = ''.join(c for c in str(request.data.get('phone', '')) if c.isdigit())
        if not phone:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': phone}


class OTPRequestPhoneThrottle(SimpleRateThrottle):
    """Each text message costs money, so cap SMS per phone number as well as per IP."""

    scope = 'otp_request_phone'

    def get_cache_key(self, request, view):
        phone = ''.join(c for c in str(request.data.get('phone', '')) if c.isdigit())
        if not phone:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': phone[-10:]}
