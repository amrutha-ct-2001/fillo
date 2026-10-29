from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Vehicle, normalize_plate


class VehicleSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = (
            'id',
            'plate_number',
            'vehicle_type',
            'photo',
            'photo_url',
            'customer',
            'model_name',
            'colour',
            'notes',
            'created_at',
        )
        read_only_fields = ('id', 'customer', 'photo_url', 'created_at')

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get('request')
        url = obj.photo.url
        if request:
            return request.build_absolute_uri(url)
        return url


class VehicleCreateSerializer(serializers.Serializer):
    plate_number = serializers.CharField(max_length=20)
    phone = serializers.CharField(max_length=15)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    vehicle_type = serializers.ChoiceField(
        choices=['BIKE', 'CAR', 'OTHER'], default='BIKE', required=False
    )
    model_name = serializers.CharField(max_length=80, required=False, allow_blank=True)
    colour = serializers.CharField(max_length=40, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    photo = serializers.ImageField(required=False)

    def validate_plate_number(self, value):
        plate = normalize_plate(value)
        if len(plate) < 4:
            raise serializers.ValidationError('Invalid plate number')
        return plate
