"""Populate the database with demo data. Run: python seed.py"""
import random

from app.database import Base, SessionLocal, engine
from app.models import FuelType, Reward, Role, Station, User
from app.security import hash_password
from app.services import record_fuel

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

stations = [
    Station(name="Fillo Central", address="12 MG Road", city="Bengaluru"),
    Station(name="Fillo Highway 44", address="NH44, Km 32", city="Hyderabad"),
    Station(name="Fillo Marina", address="Beach Road", city="Chennai"),
]
db.add_all(stations)
db.flush()


def make_user(name, email, phone, role, station=None):
    user = User(
        name=name,
        email=email,
        phone=phone,
        password_hash=hash_password("password123"),
        role=role,
        station_id=station.id if station else None,
    )
    db.add(user)
    return user


admin = make_user("Fillo Admin", "admin@fillo.app", "9000000001", Role.admin)
staff = make_user("Ravi Kumar", "staff@fillo.app", "9000000002", Role.staff, stations[0])
make_user("Anita Sharma", "staff2@fillo.app", "9000000003", Role.staff, stations[1])
customer = make_user("Demo Customer", "customer@fillo.app", "9000000010", Role.customer)
others = [
    make_user(f"Customer {i}", f"customer{i}@fillo.app", f"90000001{i:02d}", Role.customer) for i in range(1, 6)
]

db.add_all(
    [
        Reward(title="Free Car Wash", description="One exterior wash at any Fillo station", points_cost=150),
        Reward(title="₹100 Fuel Voucher", description="Flat ₹100 off your next fill", points_cost=250),
        Reward(title="Free Air & Nitrogen Check", description="Tyre top-up with nitrogen", points_cost=50),
        Reward(title="Coffee on Us", description="Any hot beverage at the Fillo café", points_cost=80, stock=100),
        Reward(title="₹500 Fuel Voucher", description="Flat ₹500 off on fills above ₹2000", points_cost=1000),
    ]
)
db.commit()

random.seed(7)
for c in [customer, *others]:
    for _ in range(random.randint(3, 8)):
        fuel = random.choice([FuelType.petrol, FuelType.diesel, FuelType.cng])
        litres = round(random.uniform(5, 45), 2)
        rate = {FuelType.petrol: 102.5, FuelType.diesel: 89.6, FuelType.cng: 76.0}[fuel]
        record_fuel(db, staff, c, fuel, litres, round(litres * rate, 2))

print("Seeded demo data. All accounts use password: password123")
for email in ["admin@fillo.app", "staff@fillo.app", "customer@fillo.app"]:
    print("  -", email)
db.close()
