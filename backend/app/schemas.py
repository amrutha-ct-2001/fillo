from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import FuelType, RedemptionStatus, Role


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------- Users ----------
class StationBrief(ORM):
    id: int
    name: str


class UserOut(ORM):
    id: int
    name: str
    email: EmailStr
    phone: str
    role: Role
    member_code: str
    points: int
    is_active: bool
    station: StationBrief | None = None
    created_at: datetime


class UserCreate(RegisterIn):
    role: Role = Role.staff
    station_id: int | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    role: Role | None = None
    is_active: bool | None = None
    station_id: int | None = None


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2)
    phone: str | None = Field(default=None, min_length=7)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class CustomerLookup(ORM):
    id: int
    name: str
    phone: str
    member_code: str
    points: int


# ---------- Stations ----------
class StationIn(BaseModel):
    name: str
    address: str = ""
    city: str = ""
    is_active: bool = True


class StationOut(ORM):
    id: int
    name: str
    address: str
    city: str
    is_active: bool


# ---------- Transactions ----------
class TransactionIn(BaseModel):
    member_code: str
    fuel_type: FuelType
    litres: float = Field(gt=0)
    amount: float = Field(gt=0)


class TransactionOut(ORM):
    id: int
    fuel_type: FuelType
    litres: float
    amount: float
    points_earned: int
    created_at: datetime
    customer: CustomerLookup
    station: StationBrief | None = None


# ---------- Rewards ----------
class RewardIn(BaseModel):
    title: str
    description: str = ""
    points_cost: int = Field(gt=0)
    stock: int | None = Field(default=None, ge=0)
    is_active: bool = True


class RewardOut(ORM):
    id: int
    title: str
    description: str
    points_cost: int
    stock: int | None
    is_active: bool


class RedemptionOut(ORM):
    id: int
    code: str
    points_spent: int
    status: RedemptionStatus
    created_at: datetime
    used_at: datetime | None
    reward: RewardOut
    customer: CustomerLookup


# ---------- Dashboard ----------
class DashboardOut(BaseModel):
    total_customers: int
    total_staff: int
    total_stations: int
    total_transactions: int
    total_revenue: float
    total_litres: float
    points_issued: int
    points_redeemed: int
    pending_redemptions: int
    recent_transactions: list[TransactionOut]


class StaffSummary(BaseModel):
    today_transactions: int
    today_amount: float
    today_litres: float
    today_points: int


class CustomerSummary(BaseModel):
    points: int
    member_code: str
    total_spent: float
    total_litres: float
    visits: int
    next_reward: RewardOut | None
