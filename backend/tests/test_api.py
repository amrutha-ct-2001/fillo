import os

os.environ["FILLO_DATABASE_URL"] = "sqlite:///./test_fillo.db"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Role, User
from app.security import hash_password

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    for email, phone, role in [("admin@t.io", "1110000001", Role.admin), ("staff@t.io", "1110000002", Role.staff)]:
        db.add(User(name=role.value, email=email, phone=phone, role=role, password_hash=hash_password("secret1")))
    db.commit()
    db.close()
    yield


def auth(email, password="secret1"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def register_customer():
    res = client.post(
        "/api/auth/register",
        json={"name": "Cust", "email": "c@t.io", "phone": "1110000099", "password": "secret1"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]


def test_full_loyalty_flow():
    cust_h, cust = register_customer()
    staff_h = auth("staff@t.io")
    admin_h = auth("admin@t.io")

    # Staff records a ₹1,250 fill -> 125 points
    res = client.post(
        "/api/staff/transactions",
        headers=staff_h,
        json={"member_code": cust["member_code"], "fuel_type": "petrol", "litres": 12.2, "amount": 1250},
    )
    assert res.status_code == 201, res.text
    assert res.json()["points_earned"] == 125

    # Admin creates a reward; customer redeems it
    reward = client.post(
        "/api/admin/rewards", headers=admin_h, json={"title": "Wash", "points_cost": 100, "stock": 1}
    ).json()
    res = client.post(f"/api/customer/rewards/{reward['id']}/redeem", headers=cust_h)
    assert res.status_code == 201, res.text
    code = res.json()["code"]
    assert client.get("/api/auth/me", headers=cust_h).json()["points"] == 25

    # Out of stock now
    assert client.post(f"/api/customer/rewards/{reward['id']}/redeem", headers=cust_h).status_code == 400

    # Staff verifies voucher once only
    assert client.post(f"/api/staff/redemptions/{code}/use", headers=staff_h).json()["status"] == "used"
    assert client.post(f"/api/staff/redemptions/{code}/use", headers=staff_h).status_code == 400

    dash = client.get("/api/admin/dashboard", headers=admin_h).json()
    assert dash["total_customers"] == 1
    assert dash["points_issued"] == 125
    assert dash["points_redeemed"] == 100


def test_role_guards():
    cust_h, _ = register_customer()
    staff_h = auth("staff@t.io")
    assert client.get("/api/admin/dashboard", headers=cust_h).status_code == 403
    assert client.get("/api/admin/dashboard", headers=staff_h).status_code == 403
    assert client.get("/api/staff/summary", headers=cust_h).status_code == 403
    assert client.get("/api/customer/summary", headers=staff_h).status_code == 403
    assert client.get("/api/customer/summary").status_code == 401


def test_cancel_refunds_points():
    cust_h, cust = register_customer()
    admin_h = auth("admin@t.io")
    client.post("/api/admin/users/{}/adjust-points?delta=300".format(cust["id"]), headers=admin_h)
    reward = client.post("/api/admin/rewards", headers=admin_h, json={"title": "Voucher", "points_cost": 250}).json()
    red = client.post(f"/api/customer/rewards/{reward['id']}/redeem", headers=cust_h).json()
    res = client.post(f"/api/admin/redemptions/{red['id']}/cancel", headers=admin_h)
    assert res.json()["status"] == "cancelled"
    assert client.get("/api/auth/me", headers=cust_h).json()["points"] == 300
