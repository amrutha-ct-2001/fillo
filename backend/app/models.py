import enum
import secrets
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


def member_code():
    return "FL" + secrets.token_hex(4).upper()


def voucher_code():
    return secrets.token_hex(3).upper()


class Role(str, enum.Enum):
    admin = "admin"
    staff = "staff"
    customer = "customer"


class FuelType(str, enum.Enum):
    petrol = "petrol"
    diesel = "diesel"
    cng = "cng"
    ev = "ev"


class RedemptionStatus(str, enum.Enum):
    pending = "pending"
    used = "used"
    cancelled = "cancelled"


class Station(Base):
    __tablename__ = "stations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    address: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(80), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    staff: Mapped[list["User"]] = relationship(back_populates="station")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.customer)
    member_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, default=member_code)
    points: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    station_id: Mapped[int | None] = mapped_column(ForeignKey("stations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    station: Mapped[Station | None] = relationship(back_populates="staff")


class FuelTransaction(Base):
    __tablename__ = "fuel_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    station_id: Mapped[int | None] = mapped_column(ForeignKey("stations.id"), nullable=True)
    fuel_type: Mapped[FuelType] = mapped_column(Enum(FuelType))
    litres: Mapped[float] = mapped_column(Float)
    amount: Mapped[float] = mapped_column(Float)
    points_earned: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    customer: Mapped[User] = relationship(foreign_keys=[customer_id])
    staff: Mapped[User] = relationship(foreign_keys=[staff_id])
    station: Mapped[Station | None] = relationship()


class Reward(Base):
    __tablename__ = "rewards"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(500), default="")
    points_cost: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Redemption(Base):
    __tablename__ = "redemptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(12), unique=True, index=True, default=voucher_code)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reward_id: Mapped[int] = mapped_column(ForeignKey("rewards.id"))
    points_spent: Mapped[int] = mapped_column(Integer)
    status: Mapped[RedemptionStatus] = mapped_column(Enum(RedemptionStatus), default=RedemptionStatus.pending)
    verified_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped[User] = relationship(foreign_keys=[customer_id])
    reward: Mapped[Reward] = relationship()
    verified_by: Mapped[User | None] = relationship(foreign_keys=[verified_by_id])
