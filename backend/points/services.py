from decimal import Decimal

from django.db.models import Sum

from .models import LedgerType, PointsLedger, Settings


def get_balance(customer) -> int:
    total = PointsLedger.objects.filter(customer=customer).aggregate(s=Sum('delta'))['s']
    return int(total or 0)


def get_settings() -> Settings:
    return Settings.get_solo()


def calculate_earn_points(amount) -> int:
    settings = get_settings()
    amount = Decimal(str(amount))
    unit = Decimal(settings.earn_rupees_unit or 100)
    per = settings.earn_points_per_rupees or 1
    if unit <= 0:
        return 0
    return int((amount // unit) * per)


def calculate_redeem_value(points: int) -> Decimal:
    settings = get_settings()
    if settings.redeem_rate is None:
        return Decimal('0')
    return Decimal(points) * Decimal(settings.redeem_rate)


def add_ledger_entry(
    *,
    customer,
    delta: int,
    entry_type: str,
    transaction=None,
    note: str = '',
    created_by=None,
) -> PointsLedger:
    if delta == 0:
        raise ValueError('delta cannot be zero')
    if entry_type == LedgerType.REDEEM and delta > 0:
        delta = -abs(delta)
    if entry_type == LedgerType.EARN and delta < 0:
        delta = abs(delta)
    return PointsLedger.objects.create(
        customer=customer,
        delta=delta,
        type=entry_type,
        transaction=transaction,
        note=note,
        created_by=created_by,
    )
