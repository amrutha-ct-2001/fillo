from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import FuelTransaction, Redemption, RedemptionStatus, Reward, Role, Station, User
from ..schemas import (
    DashboardOut,
    RedemptionOut,
    RewardIn,
    RewardOut,
    StationIn,
    StationOut,
    TransactionOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from ..security import hash_password, require_admin
from ..services import cancel_redemption

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------- Dashboard ----------
@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    def count_role(role):
        return db.scalar(select(func.count(User.id)).where(User.role == role))

    txn_count, revenue, litres, issued = db.execute(
        select(
            func.count(FuelTransaction.id),
            func.coalesce(func.sum(FuelTransaction.amount), 0),
            func.coalesce(func.sum(FuelTransaction.litres), 0),
            func.coalesce(func.sum(FuelTransaction.points_earned), 0),
        )
    ).one()
    redeemed = db.scalar(
        select(func.coalesce(func.sum(Redemption.points_spent), 0)).where(
            Redemption.status != RedemptionStatus.cancelled
        )
    )
    pending = db.scalar(select(func.count(Redemption.id)).where(Redemption.status == RedemptionStatus.pending))
    recent = db.scalars(select(FuelTransaction).order_by(FuelTransaction.created_at.desc()).limit(10)).all()

    return DashboardOut(
        total_customers=count_role(Role.customer),
        total_staff=count_role(Role.staff),
        total_stations=db.scalar(select(func.count(Station.id))),
        total_transactions=txn_count,
        total_revenue=revenue,
        total_litres=litres,
        points_issued=issued,
        points_redeemed=redeemed,
        pending_redemptions=pending,
        recent_transactions=recent,
    )


# ---------- Users ----------
@router.get("/users", response_model=list[UserOut])
def list_users(role: Role | None = None, q: str | None = None, db: Session = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    return db.scalars(stmt).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(or_(User.email == data.email.lower(), User.phone == data.phone))):
        raise HTTPException(409, "Email or phone already registered")
    if data.station_id and not db.get(Station, data.station_id):
        raise HTTPException(404, "Station not found")
    user = User(
        name=data.name,
        email=data.email.lower(),
        phone=data.phone,
        password_hash=hash_password(data.password),
        role=data.role,
        station_id=data.station_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if data.station_id and not db.get(Station, data.station_id):
        raise HTTPException(404, "Station not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/adjust-points", response_model=UserOut)
def adjust_points(user_id: int, delta: int = Query(...), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.role != Role.customer:
        raise HTTPException(404, "Customer not found")
    user.points = max(0, user.points + delta)
    db.commit()
    db.refresh(user)
    return user


# ---------- Stations ----------
@router.get("/stations", response_model=list[StationOut])
def list_stations(db: Session = Depends(get_db)):
    return db.scalars(select(Station).order_by(Station.name)).all()


@router.post("/stations", response_model=StationOut, status_code=201)
def create_station(data: StationIn, db: Session = Depends(get_db)):
    station = Station(**data.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    return station


@router.put("/stations/{station_id}", response_model=StationOut)
def update_station(station_id: int, data: StationIn, db: Session = Depends(get_db)):
    station = db.get(Station, station_id)
    if not station:
        raise HTTPException(404, "Station not found")
    for field, value in data.model_dump().items():
        setattr(station, field, value)
    db.commit()
    db.refresh(station)
    return station


# ---------- Rewards ----------
@router.get("/rewards", response_model=list[RewardOut])
def list_rewards(db: Session = Depends(get_db)):
    return db.scalars(select(Reward).order_by(Reward.points_cost)).all()


@router.post("/rewards", response_model=RewardOut, status_code=201)
def create_reward(data: RewardIn, db: Session = Depends(get_db)):
    reward = Reward(**data.model_dump())
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


@router.put("/rewards/{reward_id}", response_model=RewardOut)
def update_reward(reward_id: int, data: RewardIn, db: Session = Depends(get_db)):
    reward = db.get(Reward, reward_id)
    if not reward:
        raise HTTPException(404, "Reward not found")
    for field, value in data.model_dump().items():
        setattr(reward, field, value)
    db.commit()
    db.refresh(reward)
    return reward


@router.delete("/rewards/{reward_id}", status_code=204)
def deactivate_reward(reward_id: int, db: Session = Depends(get_db)):
    reward = db.get(Reward, reward_id)
    if not reward:
        raise HTTPException(404, "Reward not found")
    reward.is_active = False
    db.commit()


# ---------- Transactions & redemptions ----------
@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(limit: int = Query(100, le=500), db: Session = Depends(get_db)):
    return db.scalars(select(FuelTransaction).order_by(FuelTransaction.created_at.desc()).limit(limit)).all()


@router.get("/redemptions", response_model=list[RedemptionOut])
def list_redemptions(status: RedemptionStatus | None = None, db: Session = Depends(get_db)):
    stmt = select(Redemption).order_by(Redemption.created_at.desc())
    if status:
        stmt = stmt.where(Redemption.status == status)
    return db.scalars(stmt).all()


@router.post("/redemptions/{redemption_id}/cancel", response_model=RedemptionOut)
def cancel(redemption_id: int, db: Session = Depends(get_db)):
    redemption = db.get(Redemption, redemption_id)
    if not redemption:
        raise HTTPException(404, "Redemption not found")
    return cancel_redemption(db, redemption)
