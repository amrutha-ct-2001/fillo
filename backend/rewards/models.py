import secrets

from django.conf import settings
from django.db import models


def voucher_code() -> str:
    # No 0/O/1/I so codes read back cleanly over the counter.
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(secrets.choice(alphabet) for _ in range(6))


class Reward(models.Model):
    """Catalog item a customer can buy with points (car wash, fuel voucher, ...)."""

    title = models.CharField(max_length=120)
    description = models.CharField(max_length=500, blank=True)
    points_cost = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(null=True, blank=True, help_text='Blank = unlimited')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['points_cost', 'title']

    def __str__(self):
        return f'{self.title} ({self.points_cost} pts)'


class RedemptionStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    USED = 'USED', 'Used'
    CANCELLED = 'CANCELLED', 'Cancelled'


class Redemption(models.Model):
    """A voucher: points spent on a reward, shown at the counter and marked used by staff."""

    code = models.CharField(max_length=12, unique=True, default=voucher_code)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='redemptions'
    )
    reward = models.ForeignKey(Reward, on_delete=models.PROTECT, related_name='redemptions')
    points_spent = models.PositiveIntegerField()
    status = models.CharField(
        max_length=10, choices=RedemptionStatus.choices, default=RedemptionStatus.PENDING
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_redemptions',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} {self.status}'
