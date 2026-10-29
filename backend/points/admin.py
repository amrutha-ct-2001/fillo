from django.contrib import admin

from .models import PointsLedger, Settings


@admin.register(PointsLedger)
class PointsLedgerAdmin(admin.ModelAdmin):
    list_display = ('customer', 'type', 'delta', 'transaction', 'note', 'created_at')
    list_filter = ('type',)
    search_fields = ('customer__phone', 'customer__name', 'note')
    raw_id_fields = ('customer', 'transaction', 'created_by')
    readonly_fields = ('created_at',)


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = (
        'earn_points_per_rupees',
        'earn_rupees_unit',
        'redeem_rate',
        'min_redeem_points',
        'instant_redeem',
        'updated_at',
    )

    def has_add_permission(self, request):
        return not Settings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
