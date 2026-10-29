import os

from django.conf import settings as django_settings
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

from accounts.models import Role
from points.models import Settings
from rewards.models import Reward
from stations.models import Station

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed admin, staff users and default loyalty settings'

    def handle(self, *args, **options):
        # Demo PINs (1234) are only for local development. In production the
        # PINs must be provided explicitly and are never reset on re-seed.
        debug = django_settings.DEBUG
        admin_pin = os.getenv('SEED_ADMIN_PIN', '1234' if debug else '').strip()
        staff_pin = os.getenv('SEED_STAFF_PIN', '1234' if debug else '').strip()
        if not debug:
            for label, pin in (('SEED_ADMIN_PIN', admin_pin), ('SEED_STAFF_PIN', staff_pin)):
                if len(pin) != 4 or not pin.isdigit() or pin in ('1234', '0000', '1111'):
                    raise CommandError(
                        f'{label} must be set to a non-trivial 4-digit PIN when DEBUG is off'
                    )

        settings = Settings.get_solo()
        if settings.min_redeem_points == 0:
            settings.min_redeem_points = 10
            settings.save(update_fields=['min_redeem_points', 'updated_at'])
        self.stdout.write(
            self.style.SUCCESS(
                f'Min redeem points: {settings.min_redeem_points}'
            )
        )

        # Admin — username + PIN login. Phone kept on record: 9999999999
        admin, admin_created = User.objects.get_or_create(
            phone='9999999999',
            defaults={
                'name': 'Admin',
                'role': Role.ADMIN,
                'username': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        admin.username = 'admin'
        admin.name = 'Admin'
        admin.role = Role.ADMIN
        admin.is_staff = True
        admin.is_superuser = True
        if admin_created or debug:
            admin.set_pin(admin_pin)
        admin.save()
        self.stdout.write(
            self.style.SUCCESS(
                f'Admin login → username: admin  PIN: {admin_pin if debug else "(as configured)"}  (phone on file: 9999999999)'
            )
        )

        # Staff — username + PIN login. Phone kept on record: 8888888888
        staff, staff_created = User.objects.get_or_create(
            phone='8888888888',
            defaults={
                'name': 'Rajesh',
                'role': Role.STAFF,
                'username': 'staff',
            },
        )
        staff.username = 'staff'
        staff.name = 'Rajesh'
        staff.role = Role.STAFF
        if staff_created or debug:
            staff.set_pin(staff_pin)
        staff.save()
        self.stdout.write(
            self.style.SUCCESS(
                f'Staff login → username: staff  PIN: {staff_pin if debug else "(as configured)"}  (phone on file: 8888888888)'
            )
        )

        # Stations and a starter rewards catalog, only on an empty database.
        if not Station.objects.exists():
            Station.objects.bulk_create(
                [
                    Station(name='Fillo Central', address='12 MG Road', city='Bengaluru'),
                    Station(name='Fillo Highway 44', address='NH44, Km 32', city='Hyderabad'),
                ]
            )
        if not staff.station_id:
            staff.station = Station.objects.order_by('id').first()
            staff.save(update_fields=['station'])
        self.stdout.write(self.style.SUCCESS(f'Stations: {Station.objects.count()}'))

        if not Reward.objects.exists():
            Reward.objects.bulk_create(
                [
                    Reward(title='Free Air & Nitrogen Check', description='Tyre top-up with nitrogen', points_cost=20),
                    Reward(title='Coffee on Us', description='Any hot drink at the station cafe', points_cost=30, stock=100),
                    Reward(title='Free Car Wash', description='One exterior wash at any Fillo station', points_cost=60),
                    Reward(title='₹100 Fuel Voucher', description='Flat ₹100 off your next fill', points_cost=100),
                ]
            )
        self.stdout.write(self.style.SUCCESS(f'Rewards: {Reward.objects.count()}'))

        if debug:
            self.stdout.write(
                self.style.SUCCESS('Customer login → phone + OTP 123456 (any new number)')
            )
