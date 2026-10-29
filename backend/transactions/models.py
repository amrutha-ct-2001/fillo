from django.conf import settings
from django.db import models


class PaymentMode(models.TextChoices):
    UPI = 'UPI', 'UPI'
    CASH = 'CASH', 'Cash'
    CARD = 'CARD', 'Card'


class Transaction(models.Model):
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.PROTECT,
        related_name='transactions',
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='transactions',
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='staff_transactions',
    )
    station = models.ForeignKey(
        'stations.Station',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    fuel_type = models.CharField(max_length=40, blank=True)
    payment_mode = models.CharField(max_length=10, choices=PaymentMode.choices)
    payment_proof = models.ImageField(upload_to='payments/', blank=True, null=True)
    vehicle_photo = models.ImageField(upload_to='fills/', blank=True, null=True)
    points_earned = models.PositiveIntegerField(default=0)
    points_redeemed = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=255, blank=True)
    # Client-generated key so a retried upload can't create a second fill.
    client_id = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['staff', 'client_id'],
                name='uniq_txn_staff_client_id',
            )
        ]

    def __str__(self):
        return f'Txn #{self.pk} ₹{self.amount}'
