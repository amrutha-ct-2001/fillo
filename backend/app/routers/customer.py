from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import FuelTransaction, Redemption, Reward, Station, User
from ..schemas import CustomerSummary, RedemptionOut, RewardOut, StationOut, TransactionOut
from ..security import require_customer
from ..services import redeem_reward

router = APIRouter(prefix="/api/customer", tags=["customer"])


@router.get("/summary", response_model=CustomerSummary)
def summary(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    spent, litres, visits = db.execute(
        select(
            func.coalesce(func.sum(FuelTransaction.amount), 0),
            func.coalesce(func.sum(FuelTransaction.litres), 0),
            func.count(FuelTransaction.id),
        ).where(FuelTransaction.customer_id == user.id)
    ).one()
    next_reward = db.scalar(
        select(Reward)
        .where(Reward.is_active, Reward.points_cost > user.points)
        .order_by(Reward.points_cost)
        .limit(1)
    )
    return CustomerSummary(
        points=user.points,
        member_code=user.member_code,
        total_spent=spent,
        total_litres=litres,
        visits=visits,
        next_reward=next_reward,
    )


@router.get("/transactions", response_model=list[TransactionOut])
def my_transactions(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    return db.scalars(
        select(FuelTransaction)
        .where(FuelTransaction.customer_id == user.id)
        .order_by(FuelTransaction.created_at.desc())
    ).all()


@router.get("/rewards", response_model=list[RewardOut])
def rewards(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    return db.scalars(select(Reward).where(Reward.is_active).order_by(Reward.points_cost)).all()


@router.post("/rewards/{reward_id}/redeem", response_model=RedemptionOut, status_code=201)
def redeem(reward_id: int, user: User = Depends(require_customer), db: Session = Depends(get_db)):
    reward = db.get(Reward, reward_id)
    if not reward:
        raise HTTPException(404, "Reward not found")
    return redeem_reward(db, user, reward)


@router.get("/redemptions", response_model=list[RedemptionOut])
def my_redemptions(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    return db.scalars(
        select(Redemption).where(Redemption.customer_id == user.id).order_by(Redemption.created_at.desc())
    ).all()


@router.get("/stations", response_model=list[StationOut])
def stations(user: User = Depends(require_customer), db: Session = Depends(get_db)):
    return db.scalars(select(Station).where(Station.is_active).order_by(Station.name)).all()
