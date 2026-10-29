from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    STAFF = 'STAFF', 'Staff'
    CUSTOMER = 'CUSTOMER', 'Customer'


class UserManager(BaseUserManager):
    def create_user(self, phone=None, password=None, **extra_fields):
        phone = self.normalize_phone(phone) if phone else None
        if not phone and extra_fields.get('role', Role.CUSTOMER) == Role.CUSTOMER:
            raise ValueError('Phone number is required for customers')
        user = self.model(phone=phone or None, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Role.ADMIN)
        extra_fields.setdefault('is_active', True)
        return self.create_user(phone, password, **extra_fields)

    @staticmethod
    def normalize_phone(phone: str) -> str:
        digits = ''.join(c for c in str(phone) if c.isdigit())
        if len(digits) > 10 and digits.startswith('91'):
            digits = digits[-10:]
        return digits


class User(AbstractBaseUser, PermissionsMixin):
    phone = models.CharField(max_length=15, unique=True, null=True, blank=True)
    username = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text='Login username for Admin / Staff (not used by customers)',
    )
    name = models.CharField(max_length=120, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    station = models.ForeignKey(
        'stations.Station',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff',
        help_text='Station a staff member works at',
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        if self.username:
            return f'{self.username} ({self.role})'
        return f'{self.phone or "user"} ({self.role})'

    def set_pin(self, pin: str):
        self.set_password(pin)

    def check_pin(self, pin: str) -> bool:
        return self.check_password(pin)

    @property
    def is_admin_role(self):
        return self.role == Role.ADMIN or self.is_superuser

    @property
    def is_staff_role(self):
        return self.role in (Role.STAFF, Role.ADMIN) or self.is_superuser


class PhoneOTP(models.Model):
    """A one-time login code sent to a customer's phone. Only a hash is stored."""

    phone = models.CharField(max_length=15, db_index=True)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used = models.BooleanField(default=False)

    def __str__(self):
        return f'OTP for {self.phone} at {self.created_at:%Y-%m-%d %H:%M}'
