from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction as db_transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role, UserManager
from accounts.permissions import IsAdmin, IsStaffUser
from points.models import LedgerType
from points.services import (
    add_ledger_entry,
    calculate_earn_points,
    get_balance,
    get_settings,
)
from rewards.models import Redemption, RedemptionStatus
from stations.models import Station
from vehicles.models import Vehicle, normalize_plate

from .models import Transaction
from .serializers import TransactionCreateSerializer, TransactionSerializer

User = get_user_model()


def _copy_upload(uploaded, fallback_name: str = 'upload.jpg'):
    """Clone an uploaded file so it can be saved to more than one ImageField."""
    if not uploaded:
        return None
    name = getattr(uploaded, 'name', None) or fallback_name
    try:
        uploaded.seek(0)
    except Exception:
        pass
    return ContentFile(uploaded.read(), name=name)


def _reject(detail, status_code=400):
    """Error response that also rolls back the surrounding atomic block, so a
    rejected fill doesn't leave a half-created customer/vehicle behind."""
    db_transaction.set_rollback(True)
    return Response({'detail': detail}, status=status_code)


class TransactionCreateView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = TransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client_id = serializer.validated_data.get('client_id')

        # Retried upload (timeout, double sync): return the original fill.
        if client_id:
            existing = self._existing(request, client_id)
            if existing:
                return existing
        try:
            with db_transaction.atomic():
                return self._create(request, serializer.validated_data)
        except IntegrityError:
            # Two requests with the same client_id raced; the loser lands here.
            if client_id:
                existing = self._existing(request, client_id)
                if existing:
                    return existing
            raise

    def _existing(self, request, client_id):
        txn = (
            Transaction.objects.select_related('vehicle', 'customer', 'staff')
            .filter(staff=request.user, client_id=client_id)
            .first()
        )
        if not txn:
            return None
        payload = TransactionSerializer(txn, context={'request': request}).data
        payload['customer_balance'] = get_balance(txn.customer)
        payload['duplicate'] = True
        return Response(payload, status=status.HTTP_200_OK)

    @staticmethod
    def _device_time(value):
        """Trust the device clock only within a sane window; otherwise use now."""
        if not value:
            return None
        now = timezone.now()
        if value > now + timedelta(minutes=5) or value < now - timedelta(days=30):
            return None
        return value

    def _create(self, request, data):
        vehicle_photo = data.get('vehicle_photo')
        payment_proof = data.get('payment_proof')

        vehicle = None
        if data.get('vehicle_id'):
            try:
                vehicle = Vehicle.objects.select_related('customer').get(pk=data['vehicle_id'])
            except Vehicle.DoesNotExist:
                return _reject('Vehicle not found', 404)
        else:
            plate = normalize_plate(data['plate_number'])
            phone = UserManager.normalize_phone(data.get('phone', ''))
            try:
                vehicle = Vehicle.objects.select_related('customer').get(plate_number=plate)
            except Vehicle.DoesNotExist:
                if not phone:
                    return _reject('New vehicle requires customer phone')
                customer, _ = User.objects.get_or_create(
                    phone=phone,
                    defaults={
                        'name': data.get('name', ''),
                        'role': Role.CUSTOMER,
                    },
                )
                vehicle = Vehicle.objects.create(
                    plate_number=plate,
                    customer=customer,
                    vehicle_type=data.get('vehicle_type', 'BIKE'),
                    photo=_copy_upload(vehicle_photo, 'vehicle.jpg'),
                )

        # Lock the customer row so concurrent fills can't both redeem the same points.
        customer = User.objects.select_for_update().get(pk=vehicle.customer_id)
        amount = Decimal(data['amount'])
        points_to_redeem = int(data.get('points_to_redeem') or 0)
        settings = get_settings()
        points_earned = calculate_earn_points(amount)

        if points_to_redeem:
            if settings.redeem_rate is None:
                return _reject('Redeem is not enabled yet')
            if points_to_redeem < settings.min_redeem_points:
                return _reject(f'Minimum redeem is {settings.min_redeem_points} points')
            usable = get_balance(customer)
            if settings.instant_redeem:
                # Points earned on this fill can be used on this same fill.
                usable += points_earned
            if points_to_redeem > usable:
                return _reject('Insufficient points')

        txn = Transaction.objects.create(
            vehicle=vehicle,
            customer=customer,
            staff=request.user,
            station_id=request.user.station_id,
            amount=amount,
            fuel_type=data.get('fuel_type', ''),
            payment_mode=data['payment_mode'],
            payment_proof=_copy_upload(payment_proof, 'payment.jpg'),
            vehicle_photo=_copy_upload(vehicle_photo, 'vehicle.jpg'),
            points_earned=points_earned,
            points_redeemed=points_to_redeem,
            notes=data.get('notes', ''),
            client_id=data.get('client_id'),
        )
        occurred_at = self._device_time(data.get('created_at'))
        if occurred_at:
            # auto_now_add ignores values passed to create().
            Transaction.objects.filter(pk=txn.pk).update(created_at=occurred_at)
            txn.created_at = occurred_at

        if points_earned:
            add_ledger_entry(
                customer=customer,
                delta=points_earned,
                entry_type=LedgerType.EARN,
                transaction=txn,
                note=f'Earned on fill ₹{amount}',
                created_by=request.user,
            )
        if points_to_redeem:
            add_ledger_entry(
                customer=customer,
                delta=-points_to_redeem,
                entry_type=LedgerType.REDEEM,
                transaction=txn,
                note=f'Redeemed on fill ₹{amount}',
                created_by=request.user,
            )

        payload = TransactionSerializer(txn, context={'request': request}).data
        payload['customer_balance'] = get_balance(customer)
        return Response(payload, status=status.HTTP_201_CREATED)


class MyTransactionsView(APIView):
    def get(self, request):
        qs = Transaction.objects.filter(customer=request.user).select_related(
            'vehicle', 'customer', 'staff'
        )[:50]
        return Response(
            TransactionSerializer(qs, many=True, context={'request': request}).data
        )


class StaffRecentTransactionsView(APIView):
    """Staff see only their own fills; admin sees all."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        qs = Transaction.objects.select_related('vehicle', 'customer', 'staff').order_by(
            '-created_at'
        )
        if request.user.role == Role.STAFF:
            qs = qs.filter(staff=request.user)
        qs = qs[:50]
        return Response(
            TransactionSerializer(qs, many=True, context={'request': request}).data
        )


class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.localdate()
        today_qs = Transaction.objects.filter(created_at__date=today)
        all_qs = Transaction.objects.all()
        agg = today_qs.aggregate(
            fills=Count('id'),
            amount=Sum('amount'),
            points_issued=Sum('points_earned'),
            points_redeemed=Sum('points_redeemed'),
        )
        top = (
            all_qs.values('customer_id', 'customer__phone', 'customer__name')
            .annotate(total_amount=Sum('amount'), fills=Count('id'))
            .order_by('-total_amount')[:10]
        )
        by_staff = (
            today_qs.values(
                'staff_id',
                'staff__name',
                'staff__username',
                'staff__phone',
            )
            .annotate(fills=Count('id'), total_amount=Sum('amount'))
            .order_by('-fills')
        )
        by_payment = (
            today_qs.values('payment_mode')
            .annotate(fills=Count('id'), total_amount=Sum('amount'))
            .order_by('-fills')
        )
        by_station = (
            today_qs.exclude(station=None)
            .values('station_id', 'station__name')
            .annotate(fills=Count('id'), total_amount=Sum('amount'))
            .order_by('-total_amount')
        )
        recent = (
            Transaction.objects.select_related('vehicle', 'customer', 'staff')
            .order_by('-created_at')[:20]
        )
        return Response(
            {
                'today': {
                    'fills': agg['fills'] or 0,
                    'amount': str(agg['amount'] or 0),
                    'points_issued': agg['points_issued'] or 0,
                    'points_redeemed': agg['points_redeemed'] or 0,
                },
                'top_customers': list(top),
                'by_staff': [
                    {
                        'staff_id': row['staff_id'],
                        'name': row['staff__name'] or '',
                        'username': row['staff__username'] or '',
                        'phone': row['staff__phone'] or '',
                        'fills': row['fills'],
                        'total_amount': str(row['total_amount'] or 0),
                    }
                    for row in by_staff
                ],
                'by_payment': [
                    {
                        'payment_mode': row['payment_mode'],
                        'fills': row['fills'],
                        'total_amount': str(row['total_amount'] or 0),
                    }
                    for row in by_payment
                ],
                'by_station': [
                    {
                        'station_id': row['station_id'],
                        'name': row['station__name'],
                        'fills': row['fills'],
                        'total_amount': str(row['total_amount'] or 0),
                    }
                    for row in by_station
                ],
                'recent_fills': TransactionSerializer(
                    recent, many=True, context={'request': request}
                ).data,
                'customer_count': User.objects.filter(role=Role.CUSTOMER).count(),
                'vehicle_count': Vehicle.objects.count(),
                'staff_count': User.objects.filter(role=Role.STAFF, is_active=True).count(),
                'station_count': Station.objects.filter(is_active=True).count(),
                'pending_vouchers': Redemption.objects.filter(
                    status=RedemptionStatus.PENDING
                ).count(),
            }
        )


class AdminCustomerDetailView(APIView):
    """Customer fill history — available to staff and admin."""

    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            customer = User.objects.get(pk=pk, role=Role.CUSTOMER)
        except User.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        from accounts.serializers import UserSerializer
        from vehicles.serializers import VehicleSerializer
        from points.serializers import PointsLedgerSerializer

        return Response(
            {
                'customer': UserSerializer(customer).data,
                'balance': get_balance(customer),
                'vehicles': VehicleSerializer(
                    customer.vehicles.all(), many=True, context={'request': request}
                ).data,
                'transactions': TransactionSerializer(
                    customer.transactions.select_related('vehicle', 'staff')[:30],
                    many=True,
                    context={'request': request},
                ).data,
                'ledger': PointsLedgerSerializer(
                    customer.points_ledger.all()[:30], many=True
                ).data,
            }
        )
