import {ledgerLabel, paymentLabel, pointsUsedSuffix, roleLabel, vehicleTypeLabel} from '../labels';

test('internal values get friendly names', () => {
  expect(roleLabel('CUSTOMER')).toBe('Customer');
  expect(roleLabel('STAFF')).toBe('Pump staff');
  expect(paymentLabel('UPI')).toBe('UPI');
  expect(paymentLabel('CASH')).toBe('Cash');
  expect(vehicleTypeLabel('BIKE')).toBe('Bike');
  expect(ledgerLabel('REDEEM')).toBe('Points used');
});

test('a fill row mentions points used only when some were', () => {
  expect(pointsUsedSuffix(10)).toBe(' · 10 pts used');
  expect(pointsUsedSuffix(0)).toBe('');
  expect(pointsUsedSuffix(undefined)).toBe('');
});

test('unknown or empty values degrade gracefully', () => {
  expect(roleLabel('SUPERVISOR')).toBe('Supervisor');
  expect(roleLabel(undefined)).toBe('');
});
