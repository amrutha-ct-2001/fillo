from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import otp as otp_service
from .models import Role, UserManager
from .permissions import IsAdmin
from .sms import SMSError, send_otp
from .throttles import (
    OTPRequestPhoneThrottle,
    OTPRequestThrottle,
    OTPVerifyPhoneThrottle,
    PinLoginIpThrottle,
    PinLoginUserThrottle,
)
from .serializers import (
    OTPRequestSerializer,
    OTPVerifySerializer,
    PinLoginSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
    UserSerializer,
)

User = get_user_model()


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }


class OTPRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPRequestThrottle, OTPRequestPhoneThrottle]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = UserManager.normalize_phone(serializer.validated_data['phone'])
        if len(phone) < 10:
            return Response({'detail': 'Enter a valid 10-digit mobile number.'}, status=400)

        existing = User.objects.filter(phone=phone).first()
        exists = bool(existing and existing.role == Role.CUSTOMER)
        hint = None

        if settings.OTP_MODE == 'static':
            # Development only; refused at startup when DEBUG is off (see settings).
            hint = settings.STATIC_OTP if settings.DEBUG else None
        elif existing is None or (existing.role == Role.CUSTOMER and existing.is_active):
            # Staff/admin phones never get a text: they log in with username + PIN.
            try:
                code = otp_service.issue(phone)
            except otp_service.TooSoon as e:
                return Response(
                    {'detail': f'Please wait {e.retry_after}s before asking for another OTP.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={'Retry-After': str(e.retry_after)},
                )
            try:
                send_otp(phone, code)
            except SMSError:
                otp_service.discard_latest(phone)
                return Response(
                    {'detail': 'Could not send the SMS. Please try again.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            if settings.DEBUG and settings.SMS_BACKEND == 'console':
                hint = code

        return Response(
            {
                'detail': 'OTP sent',
                'phone': phone,
                'is_new': not exists,
                'otp_hint': hint,
            }
        )


class OTPVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyPhoneThrottle]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = UserManager.normalize_phone(serializer.validated_data['phone'])
        otp = serializer.validated_data['otp']
        name = serializer.validated_data.get('name', '')

        if settings.OTP_MODE == 'static':
            if otp != settings.STATIC_OTP:
                return Response({'detail': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        elif not otp_service.verify(phone, otp):
            return Response(
                {'detail': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST
            )

        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={
                'name': name or '',
                'role': Role.CUSTOMER,
            },
        )
        if not user.is_active:
            return Response({'detail': 'Account is deactivated'}, status=403)

        # Staff / Admin must use username + PIN, not OTP.
        if user.role in (Role.STAFF, Role.ADMIN) or user.is_superuser:
            return Response(
                {'detail': 'Use Staff login with username and PIN'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if name and not user.name:
            user.name = name
            user.save(update_fields=['name'])

        return Response(issue_tokens(user))


class PinLoginView(APIView):
    """Admin / Staff login with username + PIN. Phone number stays on the account."""

    permission_classes = [AllowAny]
    throttle_classes = [PinLoginUserThrottle, PinLoginIpThrottle]

    def post(self, request):
        serializer = PinLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username'].strip().lower()
        pin = serializer.validated_data['pin']

        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid username or PIN'}, status=400)

        if user.role not in (Role.STAFF, Role.ADMIN) and not user.is_superuser:
            return Response({'detail': 'Invalid username or PIN'}, status=400)

        # Check the PIN before revealing account state.
        if not user.check_pin(pin):
            return Response({'detail': 'Invalid username or PIN'}, status=400)

        if not user.is_active:
            return Response({'detail': 'Account is deactivated'}, status=403)

        return Response(issue_tokens(user))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        name = request.data.get('name')
        if name is not None:
            request.user.name = name
            request.user.save(update_fields=['name'])
        return Response(UserSerializer(request.user).data)


class CustomerLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.permissions import IsStaffUser

        if not IsStaffUser().has_permission(request, self):
            return Response({'detail': 'Staff only'}, status=403)

        phone = UserManager.normalize_phone(request.query_params.get('phone', ''))
        if not phone:
            return Response({'detail': 'phone required'}, status=400)
        try:
            user = User.objects.get(phone=phone, role=Role.CUSTOMER)
        except User.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        from vehicles.serializers import VehicleSerializer

        data = UserSerializer(user).data
        data['vehicles'] = VehicleSerializer(user.vehicles.all(), many=True).data
        return Response(data)


class StaffListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        # Pump staff only — never list admin accounts here.
        return User.objects.filter(role=Role.STAFF).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        username = data['username'].strip().lower()
        # Admin UI adds pump staff only (not admin accounts).
        role = Role.STAFF
        name = data.get('name', '')
        pin = data['pin']
        raw_phone = (data.get('phone') or '').strip()

        if User.objects.filter(username__iexact=username).exists():
            return Response({'detail': 'Username already taken'}, status=400)

        if raw_phone:
            phone = UserManager.normalize_phone(raw_phone)
            if User.objects.filter(phone=phone).exists():
                return Response({'detail': 'Phone already registered'}, status=400)
        else:
            # Login is username + PIN; phone is only a DB unique key.
            phone = _placeholder_staff_phone(username)

        station, error = _station_or_error(data.get('station_id'))
        if error:
            return error

        user = User.objects.create(
            phone=phone,
            name=name,
            role=role,
            username=username,
            station=station,
            is_staff=False,
            is_active=True,
        )
        user.set_pin(pin)
        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


def _station_or_error(station_id):
    """Resolve an optional station id; None clears the assignment."""
    if not station_id:
        return None, None
    from stations.models import Station

    try:
        return Station.objects.get(pk=station_id), None
    except Station.DoesNotExist:
        return None, Response({'detail': 'Station not found'}, status=400)


def _placeholder_staff_phone(username: str) -> str:
    """Generate a unique 10-digit placeholder when no mobile is provided."""
    import uuid

    for _ in range(20):
        digits = ''.join(c for c in str(uuid.uuid4().int) if c.isdigit())
        phone = ('9' + digits)[:10]
        if not User.objects.filter(phone=phone).exists():
            return phone
    return f'9{abs(hash(username)) % 10**9:09d}'


class StaffUpdateView(APIView):
    """Admin can edit staff name/username and reset PIN."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role=Role.STAFF)
        except User.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

        serializer = StaffUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if 'username' in data:
            username = data['username'].strip().lower()
            if (
                User.objects.filter(username__iexact=username)
                .exclude(pk=user.pk)
                .exists()
            ):
                return Response({'detail': 'Username already taken'}, status=400)
            user.username = username

        if 'name' in data:
            user.name = data['name']

        if 'is_active' in data:
            user.is_active = data['is_active']

        if 'pin' in data:
            user.set_pin(data['pin'])

        if 'station_id' in data:
            station, error = _station_or_error(data['station_id'])
            if error:
                return error
            user.station = station

        user.save()
        return Response(UserSerializer(user).data)


class StaffDeactivateView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role=Role.STAFF)
        except User.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data)


class StaffActivateView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role=Role.STAFF)
        except User.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data)


class CustomerListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        qs = User.objects.filter(role=Role.CUSTOMER)
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(phone__icontains=q) | Q(name__icontains=q))
        return qs.order_by('-created_at')
