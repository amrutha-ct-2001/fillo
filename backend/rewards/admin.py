from django.contrib import admin

from .models import Redemption, Reward


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ('title', 'points_cost', 'stock', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title',)


@admin.register(Redemption)
class RedemptionAdmin(admin.ModelAdmin):
    list_display = ('code', 'customer', 'reward', 'points_spent', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('code', 'customer__phone', 'customer__name')
    raw_id_fields = ('customer', 'verified_by')
