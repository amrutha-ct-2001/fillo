import {computeTotals, DEFAULT_PAYMENT_MODE, proofAllowed, redeemDescription, saveErrorMessage, saveLabel, validateFill} from '../fill';

const settings: any = {
  earn_points_per_rupees: 1,
  earn_rupees_unit: 100,
  redeem_rate: '1.00',
  min_redeem_points: 10,
};

test('cash is the default and needs no photo', () => {
  expect(DEFAULT_PAYMENT_MODE).toBe('CASH');
  expect(proofAllowed('CASH')).toBe(false);
  expect(proofAllowed('UPI')).toBe(true);
  expect(proofAllowed('CARD')).toBe(true);
});

test('without redeem: pays the full amount and earns per unit', () => {
  const t = computeTotals({amount: '550', pointsBalance: 0, settings, redeem: false});
  expect(t).toMatchObject({amount: 550, payable: 550, discount: 0, points: 0, available: false, earn: 5});
});

test('redeem uses the balance plus the points this fill earns', () => {
  const t = computeTotals({amount: '500', pointsBalance: 200, settings, redeem: true});
  expect(t).toMatchObject({available: true, earn: 5, points: 205, discount: 205, payable: 295});
});

test('points from this fill can reach the minimum on the same fill', () => {
  // 8 + 2 earned now = 10
  const t = computeTotals({amount: '200', pointsBalance: 8, settings, redeem: true});
  expect(t).toMatchObject({available: true, points: 10, payable: 190});
  // a new customer's first big fill
  expect(computeTotals({amount: '1000', pointsBalance: 0, settings, redeem: true})).toMatchObject({points: 10, payable: 990});
});

test('with instant redeem off, this fill\'s points wait for the next visit', () => {
  const off = {...settings, instant_redeem: false};
  // 8 + 2 would be 10, but only the 8 already earned count
  const t = computeTotals({amount: '200', pointsBalance: 8, settings: off, redeem: true});
  expect(t).toMatchObject({available: false, earn: 2, earnUsable: 0, points: 0, payable: 200});
  const rich = computeTotals({amount: '500', pointsBalance: 42, settings: off, redeem: true});
  expect(rich).toMatchObject({points: 42, payable: 458});
  expect(redeemDescription(42, rich)).toBe('42 points = ₹42 off this fill');
});

test('redeem is capped by what the bill is worth', () => {
  const t = computeTotals({amount: '50', pointsBalance: 500, settings, redeem: true});
  expect(t.points).toBe(50);
  expect(t.payable).toBe(0);
});

test('redeem is unavailable below the minimum, without a rate, or with no amount', () => {
  // 7 + 2 = 9
  expect(computeTotals({amount: '200', pointsBalance: 7, settings, redeem: true}).available).toBe(false);
  expect(computeTotals({amount: '500', pointsBalance: 0, settings, redeem: true}).points).toBe(0);
  expect(computeTotals({amount: '500', pointsBalance: 100, settings: {...settings, redeem_rate: null}, redeem: true}).available).toBe(false);
  expect(computeTotals({amount: '', pointsBalance: 100, settings, redeem: true}).available).toBe(false);
  expect(computeTotals({amount: '500', pointsBalance: 100, settings: null, redeem: true}).available).toBe(false);
});

test('earn is computed on the pre-redeem amount, like the server', () => {
  const t = computeTotals({amount: '500', pointsBalance: 200, settings, redeem: true});
  expect(t.payable).toBe(295);
  expect(t.earn).toBe(5);
});

test('the toggle text shows where the points come from', () => {
  const t = computeTotals({amount: '200', pointsBalance: 8, settings, redeem: false});
  expect(redeemDescription(8, t)).toBe('8 + 2 from this fill · 10 points = ₹10 off this fill');
  const small = computeTotals({amount: '50', pointsBalance: 500, settings, redeem: false});
  expect(redeemDescription(500, small)).toBe('50 points = ₹50 off this fill');
});

test('junk amounts become zero', () => {
  expect(computeTotals({amount: 'abc', pointsBalance: 0, settings, redeem: false}).amount).toBe(0);
  expect(computeTotals({amount: '-5', pointsBalance: 0, settings, redeem: false}).amount).toBe(0);
});

test('validateFill reports the first problem in plain words', () => {
  const ok = {plate: 'KL07AB1234', amount: '500', isNewVehicle: false};
  expect(validateFill(ok)).toBeNull();
  expect(validateFill({...ok, plate: 'KL'})).toMatch(/plate/i);
  expect(validateFill({...ok, amount: ''})).toMatch(/amount/i);
  expect(validateFill({...ok, amount: '0'})).toMatch(/amount/i);
  expect(validateFill({...ok, amount: '999999'})).toMatch(/too large/i);
  expect(validateFill({...ok, isNewVehicle: true})).toMatch(/mobile/i);
  expect(validateFill({...ok, isNewVehicle: true, phone: '98765 43210'})).toBeNull();
});

test('saveLabel shows amount and mode', () => {
  expect(saveLabel('500', 'CASH')).toBe('SAVE ₹500 CASH');
  expect(saveLabel('1500', 'UPI')).toBe('SAVE ₹1,500 UPI');
  expect(saveLabel('', 'CASH')).toBe('ENTER AMOUNT');
});

test('saveErrorMessage returns readable text', () => {
  expect(saveErrorMessage({response: {status: 400, data: {detail: 'Insufficient points'}}})).toBe('Insufficient points');
});
