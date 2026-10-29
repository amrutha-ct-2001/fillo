from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    points_balance = serializers.SerializerMethodField()
    station_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'phone',
            'username',
            'name',
            'role',
            'station_id',
            'station_name',
            'is_active',
            'created_at',
            'points_balance',
        )
        read_only_fields = fields

    def get_points_balance(self, obj):
        from points.services import get_balance

        return get_balance(obj)

    def get_station_name(self, obj):
        return obj.station.name if obj.station_id else None


class StaffCreateSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    username = serializers.CharField(max_length=50)
    pin = serializers.RegexField(
        regex=r'^\d{4}$',
        error_messages={'invalid': 'PIN must be exactly 4 digits'},
    )
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=['STAFF', 'ADMIN'], default='STAFF')
    station_id = serializers.IntegerField(required=False, allow_null=True)


class StaffUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50, required=False)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    pin = serializers.RegexField(
        regex=r'^\d{4}$',
        required=False,
        error_messages={'invalid': 'PIN must be exactly 4 digits'},
    )
    is_active = serializers.BooleanField(required=False)
    station_id = serializers.IntegerField(required=False, allow_null=True)


class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)


class OTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=10)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)


class PinLoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50)
    pin = serializers.RegexField(
        regex=r'^\d{4}$',
        error_messages={'invalid': 'PIN must be exactly 4 digits'},
    )
