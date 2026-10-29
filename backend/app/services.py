from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import FuelTransaction, Redemption, RedemptionStatus, Reward, Role, User


def points_for_amount(amount: float) -> int:
    return int(amount // settings.amount_per_point)


def find_customer(db: Session, member_code: str) -> User:
    code = member_code.strip().upper()
    customer = db.scalar(select(User).where(User.member_code == code, User.role == Role.customer))
    if not customer:
        # Allow lookup by phone as a fallback for counter staff
        customer = db.scalar(select(User).where(User.phone == member_code.strip(), User.role == Role.customer))
    if not customer or not customer.is_active:
        raise HTTPException(404, "Customer not found")
    return customer


def record_fuel(db: Session, staff: User, customer: User, fuel_type, litres: float, amount: float) -> FuelTransaction:
    points = points_for_amount(amount)
    txn = FuelTransaction(
        customer_id=customer.id,
        staff_id=staff.id,
        station_id=staff.station_id,
        fuel_type=fuel_type,
        litres=litres,
        amount=amount,
        points_earned=points,
    )
    customer.points += points
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def redeem_reward(db: Session, customer: User, reward: Reward) -> Redemption:
    if not reward.is_active:
        raise HTTPException(400, "Reward is not available")
    if reward.stock is not None and reward.stock <= 0:
        raise HTTPException(400, "Reward is out of stock")
    if customer.points < reward.points_cost:
        raise HTTPException(400, "Not enough points")

    customer.points -= reward.points_cost
    if reward.stock is not None:
        reward.stock -= 1
    redemption = Redemption(customer_id=customer.id, reward_id=reward.id, points_spent=reward.points_cost)
    db.add(redemption)
    db.commit()
    db.refresh(redemption)
    return redemption


def mark_redemption_used(db: Session, staff: User, code: str) -> Redemption:
    redemption = db.scalar(select(Redemption).where(Redemption.code == code.strip().upper()))
    if not redemption:
        raise HTTPException(404, "Voucher not found")
    if redemption.status != RedemptionStatus.pending:
        raise HTTPException(400, f"Voucher already {redemption.status.value}")
    redemption.status = RedemptionStatus.used
    redemption.verified_by_id = staff.id
    redemption.used_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(redemption)
    return redemption


def cancel_redemption(db: Session, redemption: Redemption) -> Redemption:
    if redemption.status != RedemptionStatus.pending:
        raise HTTPException(400, "Only pending vouchers can be cancelled")
    redemption.status = RedemptionStatus.cancelled
    redemption.customer.points += redemption.points_spent
    if redemption.reward.stock is not None:
        redemption.reward.stock += 1
    db.commit()
    db.refresh(redemption)
    return redemption
