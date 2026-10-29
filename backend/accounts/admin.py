from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'phone', 'name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('phone', 'username', 'name')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('phone', 'username', 'password')}),
        ('Profile', {'fields': ('name', 'role', 'is_active')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': (
                    'phone',
                    'username',
                    'name',
                    'role',
                    'password1',
                    'password2',
                    'is_staff',
                    'is_superuser',
                ),
            },
        ),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    filter_horizontal = ('groups', 'user_permissions')
