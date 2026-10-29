from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'amount',
        'payment_mode',
        'vehicle',
        'customer',
        'staff',
        'points_earned',
        'points_redeemed',
        'created_at',
    )
    list_filter = ('payment_mode', 'created_at')
    search_fields = (
        'vehicle__plate_number',
        'customer__phone',
        'customer__name',
        'staff__phone',
    )
    raw_id_fields = ('vehicle', 'customer', 'staff')
    readonly_fields = ('created_at', 'points_earned', 'points_redeemed')
