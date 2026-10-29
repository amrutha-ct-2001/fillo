from rest_framework import serializers

from .models import Station


class StationSerializer(serializers.ModelSerializer):
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Station
        fields = ('id', 'name', 'address', 'city', 'is_active', 'staff_count', 'created_at')
        read_only_fields = ('id', 'staff_count', 'created_at')

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()
