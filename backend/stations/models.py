from django.db import models


class Station(models.Model):
    """A fuel station (outlet). Staff are assigned to one; fills record where they happened."""

    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
