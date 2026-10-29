import {
  adjustmentQuestion,
  digits4,
  parseAdjustment,
  settingsExample,
  validateReward,
  settingsToForm,
  validateSettings,
  validateStaff,
} from '../validation';

test('adjustments accept whole numbers, with or without a sign', () => {
  expect(parseAdjustment('50')).toEqual({ok: true, value: 50});
  expect(parseAdjustment('+50')).toEqual({ok: true, value: 50});
  expect(parseAdjustment(' -20 ')).toEqual({ok: true, value: -20});
});

test('adjustments reject zero, text, decimals and huge values', () => {
  for (const bad of ['', '0', 'abc', '1.5', '--3', '1e3', '999999']) {
    expect(parseAdjustment(bad).ok).toBe(false);
  }
});

test('the confirmation question says what will happen', () => {
  expect(adjustmentQuestion(50, 'Ramesh')).toBe('Add 50 points to Ramesh?');
  expect(adjustmentQuestion(-1, 'Ramesh')).toBe('Remove 1 point from Ramesh?');
});

test('PIN keeps four digits only', () => {
  expect(digits4('12a3456')).toBe('1234');
});

test('new staff need a username and a 4-digit PIN', () => {
  expect(validateStaff({username: '', pin: '1234', isNew: true})).toMatch(/username/i);
  expect(validateStaff({username: 'ra vi', pin: '1234', isNew: true})).toMatch(/spaces/i);
  expect(validateStaff({username: 'ravi', pin: '12', isNew: true})).toMatch(/PIN/);
  expect(validateStaff({username: 'ravi', pin: '1234', isNew: true})).toBeNull();
});

test('editing staff: blank PIN keeps the old one, a partial PIN is rejected', () => {
  expect(validateStaff({username: 'ravi', pin: '', isNew: false})).toBeNull();
  expect(validateStaff({username: 'ravi', pin: '12', isNew: false})).toMatch(/4 digits/);
});

test('settings convert to a form and back', () => {
  const form = settingsToForm({earn_points_per_rupees: 1, earn_rupees_unit: 100, redeem_rate: '0.50', min_redeem_points: 20, instant_redeem: false});
  expect(form).toEqual({earnPoints: '1', earnUnit: '100', redeemRate: '0.50', minRedeem: '20', instantRedeem: false});
  expect(validateSettings(form)).toEqual({
    ok: true,
    value: {earn_points_per_rupees: 1, earn_rupees_unit: 100, min_redeem_points: 20, redeem_rate: '0.50', instant_redeem: false},
  });
});

test('instant redeem is on unless the server says otherwise', () => {
  expect(settingsToForm({earn_points_per_rupees: 1, earn_rupees_unit: 100, redeem_rate: null, min_redeem_points: 10}).instantRedeem).toBe(true);
});

test('blank redeem rate switches redeeming off', () => {
  const r = validateSettings({earnPoints: '1', earnUnit: '100', redeemRate: '', minRedeem: '10', instantRedeem: true});
  expect(r.ok && r.value.redeem_rate).toBeNull();
});

test('invalid settings are explained', () => {
  const base = {earnPoints: '1', earnUnit: '100', redeemRate: '', minRedeem: '10', instantRedeem: true};
  expect(validateSettings({...base, earnPoints: '0'}).ok).toBe(false);
  expect(validateSettings({...base, earnUnit: '2.5'}).ok).toBe(false);
  expect(validateSettings({...base, redeemRate: '-1'}).ok).toBe(false);
  const noMin = validateSettings({...base, redeemRate: '1', minRedeem: '0'});
  expect(noMin.ok).toBe(false);
});

test('the example line follows the form', () => {
  expect(settingsExample({earnPoints: '2', earnUnit: '50', redeemRate: '', minRedeem: '', instantRedeem: true})).toBe('Example: 2 points for every ₹50');
  expect(settingsExample({earnPoints: '', earnUnit: '', redeemRate: '', minRedeem: '', instantRedeem: true})).toBe('Example: 1 point for every ₹100');
});

test('reward: needs a name and a whole-number cost; blank stock is unlimited', () => {
  expect(validateReward({title: '', cost: '60', stock: ''})).toEqual({ok: false, message: 'Enter the reward name.'});
  expect(validateReward({title: 'Wash', cost: '0', stock: ''}).ok).toBe(false);
  expect(validateReward({title: 'Wash', cost: '60', stock: '1.5'}).ok).toBe(false);
  expect(validateReward({title: ' Wash ', cost: '60', stock: ''})).toEqual({ok: true, value: {title: 'Wash', points_cost: 60, stock: null}});
  expect(validateReward({title: 'Coffee', cost: '30', stock: '12'})).toEqual({ok: true, value: {title: 'Coffee', points_cost: 30, stock: 12}});
});
