# Fillo Mobile

React Native CLI app (not Expo). One binary; the UI switches by role after login.

## Run

```bash
npm install
npx react-native run-android
# or
npx react-native run-ios
```

Debug builds reach the Django server on the machine serving the JS bundle (`src/api/client.ts`).

## Checks

```bash
npx tsc --noEmit && npx jest && npx eslint src && bash scripts/check-theme.sh src
```

## Features

- Customer: OTP login, points card with QR, rewards catalog and voucher codes, vehicles, history, stations
- Staff: New fill → plate photo/OCR → amount chips → UPI snap or cash → offline queue; verify reward vouchers
- Admin: dashboard, customers and point adjustments, staff with station assignment, rewards and vouchers, stations, loyalty settings

On-device plate reading uses free ML Kit text recognition on the captured photo (no cloud OCR fees).
