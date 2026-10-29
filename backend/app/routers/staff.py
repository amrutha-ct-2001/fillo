from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import FuelTransaction, Redemption, User
from ..schemas import CustomerLookup, RedemptionOut, StaffSummary, TransactionIn, TransactionOut
from ..security import require_staff
from ..services import find_customer, mark_redemption_used, record_fuel

router = APIRouter(prefix="/api/staff", tags=["staff"])


def _start_of_today():
    return datetime.combine(datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc)


@router.get("/summary", response_model=StaffSummary)
def summary(staff: User = Depends(require_staff), db: Session = Depends(get_db)):
    count, amount, litres, points = db.execute(
        select(
            func.count(FuelTransaction.id),
            func.coalesce(func.sum(FuelTransaction.amount), 0),
            func.coalesce(func.sum(FuelTransaction.litres), 0),
            func.coalesce(func.sum(FuelTransaction.points_earned), 0),
        ).where(FuelTransaction.staff_id == staff.id, FuelTransaction.created_at >= _start_of_today())
    ).one()
    return StaffSummary(today_transactions=count, today_amount=amount, today_litres=litres, today_points=points)


@router.get("/customers/{code}", response_model=CustomerLookup)
def lookup_customer(code: str, staff: User = Depends(require_staff), db: Session = Depends(get_db)):
    return find_customer(db, code)


@router.post("/transactions", response_model=TransactionOut, status_code=201)
def add_transaction(data: TransactionIn, staff: User = Depends(require_staff), db: Session = Depends(get_db)):
    customer = find_customer(db, data.member_code)
    return record_fuel(db, staff, customer, data.fuel_type, data.litres, data.amount)


@router.get("/transactions", response_model=list[TransactionOut])
def my_transactions(staff: User = Depends(require_staff), db: Session = Depends(get_db)):
    return db.scalars(
        select(FuelTransaction)
        .where(FuelTransaction.staff_id == staff.id)
        .order_by(FuelTransaction.created_at.desc())
        .limit(100)
    ).all()


@router.get("/redemptions/{code}", response_model=RedemptionOut)
def check_voucher(code: str, staff: User = Depends(require_staff), db: Session = Depends(get_db)):
    redemption = db.scalar(select(Redemption).where(Redemption.code == code.strip().upper()))
    if not redemption:
        raise HTTPException(404, "Voucher not found")
    return redemption


@router.post("/redemptions/{code}/use", response_model=RedemptionOut)
def use_voucher(code: str, staff: User = Depends(require_staff), db: Session = Depends(get_db)):
    return mark_redemption_used(db, staff, code)
