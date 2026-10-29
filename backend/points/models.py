from django.conf import settings
from django.db import models


class LedgerType(models.TextChoices):
    EARN = 'EARN', 'Earn'
    REDEEM = 'REDEEM', 'Redeem'
    ADJUST = 'ADJUST', 'Adjust'


class PointsLedger(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='points_ledger',
    )
    delta = models.IntegerField()
    type = models.CharField(max_length=10, choices=LedgerType.choices)
    transaction = models.ForeignKey(
        'transactions.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_entries',
    )
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='points_adjustments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.customer_id} {self.type} {self.delta}'


class Settings(models.Model):
    """Singleton settings row for earn/redeem rules."""

    earn_points_per_rupees = models.PositiveIntegerField(
        default=1,
        help_text='Points earned per this many rupees spent (e.g. 1 point per 100 Rs)',
    )
    earn_rupees_unit = models.PositiveIntegerField(
        default=100,
        help_text='Rupee unit for earn rule (e.g. 100 means 1 point per Rs 100)',
    )
    redeem_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Rupee value of 1 point. Leave blank until redeem is enabled.',
    )
    min_redeem_points = models.PositiveIntegerField(
        default=10,
        help_text='Customer must have at least this many points to redeem.',
    )
    instant_redeem = models.BooleanField(
        default=True,
        help_text='Points earned on a fill can be used on that same fill.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Loyalty Settings'
