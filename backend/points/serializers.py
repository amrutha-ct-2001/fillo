from rest_framework import serializers

from .models import PointsLedger, Settings


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = (
            'earn_points_per_rupees',
            'earn_rupees_unit',
            'redeem_rate',
            'min_redeem_points',
            'instant_redeem',
            'updated_at',
        )
        read_only_fields = ('updated_at',)


class PointsLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsLedger
        fields = (
            'id',
            'delta',
            'type',
            'transaction',
            'note',
            'created_at',
        )


class AdjustPointsSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    delta = serializers.IntegerField()
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)
