from django.contrib import admin

from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('plate_number', 'vehicle_type', 'customer', 'model_name', 'created_at')
    list_filter = ('vehicle_type',)
    search_fields = ('plate_number', 'customer__phone', 'customer__name', 'model_name')
    raw_id_fields = ('customer',)
    readonly_fields = ('created_at', 'updated_at')
