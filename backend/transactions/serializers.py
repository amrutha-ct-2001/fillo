from rest_framework import serializers

from accounts.serializers import UserSerializer
from vehicles.serializers import VehicleSerializer

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    staff = UserSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    payment_proof_url = serializers.SerializerMethodField()
    vehicle_photo_url = serializers.SerializerMethodField()
    station_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id',
            'vehicle',
            'customer',
            'staff',
            'station_name',
            'amount',
            'fuel_type',
            'payment_mode',
            'payment_proof',
            'payment_proof_url',
            'vehicle_photo',
            'vehicle_photo_url',
            'points_earned',
            'points_redeemed',
            'notes',
            'client_id',
            'created_at',
        )
        read_only_fields = fields

    def _abs(self, field):
        if not field:
            return None
        request = self.context.get('request')
        url = field.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_station_name(self, obj):
        return obj.station.name if obj.station_id else None

    def get_payment_proof_url(self, obj):
        return self._abs(obj.payment_proof)

    def get_vehicle_photo_url(self, obj):
        return self._abs(obj.vehicle_photo)


class TransactionCreateSerializer(serializers.Serializer):
    client_id = serializers.RegexField(
        regex=r'^[A-Za-z0-9_-]{8,64}$', required=False, allow_blank=False
    )
    # When the fill happened on the device; only meaningful for offline syncs.
    created_at = serializers.DateTimeField(required=False)
    vehicle_id = serializers.IntegerField(required=False)
    plate_number = serializers.CharField(max_length=20, required=False)
    phone = serializers.CharField(max_length=15, required=False)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    fuel_type = serializers.CharField(max_length=40, required=False, allow_blank=True)
    payment_mode = serializers.ChoiceField(choices=['UPI', 'CASH', 'CARD'])
    points_to_redeem = serializers.IntegerField(required=False, default=0, min_value=0)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)
    payment_proof = serializers.ImageField(required=False)
    vehicle_photo = serializers.ImageField(required=False)
    vehicle_type = serializers.ChoiceField(
        choices=['BIKE', 'CAR', 'OTHER'], required=False, default='BIKE'
    )

    def validate(self, attrs):
        if not attrs.get('vehicle_id') and not attrs.get('plate_number'):
            raise serializers.ValidationError('vehicle_id or plate_number is required')
        if attrs.get('payment_mode') == 'UPI' and not attrs.get('payment_proof'):
            # Allow without proof for rush-hour flexibility; staff can skip
            pass
        if attrs['amount'] <= 0:
            raise serializers.ValidationError({'amount': 'Must be greater than zero'})
        return attrs
