from django.contrib.auth import get_user_model
from django.db import transaction as db_transaction
from django.utils import timezone

from points.models import LedgerType
from points.services import add_ledger_entry, get_balance

from .models import Redemption, RedemptionStatus, Reward

User = get_user_model()


class RewardError(Exception):
    pass


@db_transaction.atomic
def redeem_reward(customer, reward_id: int) -> Redemption:
    # Lock both rows so two taps cannot overspend points or oversell stock.
    customer = User.objects.select_for_update().get(pk=customer.pk)
    try:
        reward = Reward.objects.select_for_update().get(pk=reward_id)
    except Reward.DoesNotExist:
        raise RewardError('Reward not found')
    if not reward.is_active:
        raise RewardError('This reward is not available')
    if reward.stock is not None and reward.stock <= 0:
        raise RewardError('This reward is out of stock')
    if get_balance(customer) < reward.points_cost:
        raise RewardError('Not enough points')

    if reward.stock is not None:
        reward.stock -= 1
        reward.save(update_fields=['stock'])
    redemption = Redemption.objects.create(
        customer=customer, reward=reward, points_spent=reward.points_cost
    )
    add_ledger_entry(
        customer=customer,
        delta=-reward.points_cost,
        entry_type=LedgerType.REDEEM,
        note=f'Reward: {reward.title} ({redemption.code})',
    )
    return redemption


@db_transaction.atomic
def use_voucher(staff, code: str) -> Redemption:
    try:
        redemption = Redemption.objects.select_for_update().get(code=code.strip().upper())
    except Redemption.DoesNotExist:
        raise RewardError('Voucher not found')
    if redemption.status != RedemptionStatus.PENDING:
        raise RewardError(f'Voucher already {redemption.get_status_display().lower()}')
    redemption.status = RedemptionStatus.USED
    redemption.verified_by = staff
    redemption.used_at = timezone.now()
    redemption.save(update_fields=['status', 'verified_by', 'used_at'])
    return redemption


@db_transaction.atomic
def cancel_redemption(redemption_id: int, by=None) -> Redemption:
    try:
        redemption = Redemption.objects.select_for_update().select_related('reward').get(
            pk=redemption_id
        )
    except Redemption.DoesNotExist:
        raise RewardError('Voucher not found')
    if redemption.status != RedemptionStatus.PENDING:
        raise RewardError('Only unused vouchers can be cancelled')
    redemption.status = RedemptionStatus.CANCELLED
    redemption.save(update_fields=['status'])
    reward = redemption.reward
    if reward.stock is not None:
        reward.stock += 1
        reward.save(update_fields=['stock'])
    add_ledger_entry(
        customer=redemption.customer,
        delta=redemption.points_spent,
        entry_type=LedgerType.ADJUST,
        note=f'Refund: voucher {redemption.code} cancelled',
        created_by=by,
    )
    return redemption
