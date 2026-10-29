# Fillo

Fuel-station loyalty app. Pump staff log a fill in seconds by photographing the number plate, customers earn points and swap them for rewards, and the owner runs everything from an admin dashboard.

```
fillo/
  backend/   Django + Django REST Framework API
  mobile/    React Native app (Android + iOS), one app for all three roles
```

## What each role can do

| Role | Login | Features |
|---|---|---|
| **Customer** | Mobile number + OTP | Points balance and QR card, rewards catalog, redeem rewards for voucher codes, my vouchers, vehicles, fill history, nearby stations |
| **Staff** | Username + 4-digit PIN | New fill: plate photo with on-device OCR, amount chips, UPI / cash / card with payment proof photo, use points on the fill, offline queue that syncs later. Find a customer by plate or phone, customer history, verify and mark reward vouchers as used |
| **Admin** | Username + 4-digit PIN | Sales dashboard (today's sales, by staff, by payment, by station, top customers), customers with manual point adjustments, staff management with station assignment, rewards catalog, voucher list with cancel and refund, stations, earn and redeem rules |

## Run the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_fillo     # demo admin, staff, stations, rewards
python manage.py runserver     # Fillo always runs on port 8001
python manage.py test           # 36 tests
```

Demo accounts (local development only):

| Role | Login |
|---|---|
| Admin | `admin` / PIN `1234` |
| Staff | `staff` / PIN `1234` |
| Customer | any mobile number, OTP `123456` |

## Run the mobile app

```bash
cd mobile
npm install
npx react-native run-android    # or: npx react-native run-ios
npm test                        # Jest
```

In debug builds the app talks to the Django server on the machine that serves the JS bundle (see `mobile/src/api/client.ts`). For a USB-connected Android phone run `adb reverse tcp:8001 tcp:8001` and `adb reverse tcp:8081 tcp:8081`.

Fillo uses port **8001** and its own database (`backend/db.sqlite3`) on purpose, so it never mixes with another Django project running on the usual port 8000.

## API overview

All endpoints are under `/api/` and use JWT (`Authorization: Bearer <token>`).

| Area | Endpoints |
|---|---|
| Auth | `POST auth/otp/request/`, `POST auth/otp/verify/`, `POST auth/pin/login/`, `GET/PATCH auth/me/` |
| Staff and customers (admin) | `GET/POST auth/staff/`, `PATCH auth/staff/<id>/`, `POST auth/staff/<id>/activate/` and `deactivate/`, `GET auth/customers/`, `GET auth/customers/lookup/?phone=` |
| Vehicles | `GET vehicles/lookup/?plate=`, `POST vehicles/`, `GET vehicles/mine/` |
| Fills | `POST transactions/` (multipart, idempotent with `client_id`), `GET transactions/mine/`, `GET transactions/recent/`, `GET transactions/admin/dashboard/`, `GET transactions/admin/customers/<id>/` |
| Points | `GET points/me/`, `GET/PATCH points/settings/`, `POST points/adjust/` |
| Rewards | `GET/POST rewards/`, `PATCH rewards/<id>/`, `POST rewards/<id>/redeem/`, `GET rewards/redemptions/mine/`, `GET rewards/redemptions/?status=`, `POST rewards/redemptions/<id>/cancel/`, `GET rewards/vouchers/<code>/`, `POST rewards/vouchers/<code>/use/` |
| Stations | `GET/POST stations/`, `PATCH stations/<id>/` |

## Tech

- **Backend:** Django 6, DRF, SimpleJWT, SQLite locally / PostgreSQL in production, a points ledger (every earn, use and adjustment is a row), row locks so concurrent fills or redeems can't overspend.
- **Mobile:** React Native 0.87, TypeScript, React Navigation, TanStack Query, Zustand, Vision Camera + ML Kit OCR, an offline fill queue, and a token-based design system (`mobile/DESIGN.md`).
