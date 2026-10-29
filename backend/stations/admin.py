from django.contrib import admin

from .models import Station


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'is_active', 'created_at')
    list_filter = ('is_active', 'city')
    search_fields = ('name', 'city', 'address')
