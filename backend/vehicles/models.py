import re

from django.conf import settings
from django.db import models


def normalize_plate(plate: str) -> str:
    return re.sub(r'[^A-Za-z0-9]', '', str(plate)).upper()


class VehicleType(models.TextChoices):
    BIKE = 'BIKE', 'Bike'
    CAR = 'CAR', 'Car'
    OTHER = 'OTHER', 'Other'


class Vehicle(models.Model):
    plate_number = models.CharField(max_length=20, unique=True, db_index=True)
    vehicle_type = models.CharField(
        max_length=10, choices=VehicleType.choices, default=VehicleType.BIKE
    )
    photo = models.ImageField(upload_to='vehicles/', blank=True, null=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles',
    )
    model_name = models.CharField(max_length=80, blank=True)
    colour = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.plate_number = normalize_plate(self.plate_number)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.plate_number
