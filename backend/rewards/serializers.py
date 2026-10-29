from rest_framework import serializers

from .models import Redemption, Reward


class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = ('id', 'title', 'description', 'points_cost', 'stock', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_points_cost(self, value):
        if value <= 0:
            raise serializers.ValidationError('Must be greater than zero')
        return value


class RedemptionSerializer(serializers.ModelSerializer):
    reward = RewardSerializer(read_only=True)
    customer_id = serializers.IntegerField(source='customer.id', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Redemption
        fields = (
            'id',
            'code',
            'reward',
            'points_spent',
            'status',
            'customer_id',
            'customer_name',
            'customer_phone',
            'verified_by_name',
            'created_at',
            'used_at',
        )
        read_only_fields = fields

    def get_verified_by_name(self, obj):
        user = obj.verified_by
        if not user:
            return None
        return user.name or user.username or ''
