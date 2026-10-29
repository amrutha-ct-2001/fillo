import {createDraft, draftReducer} from '../draft';

const found = (id = 7): any => ({
  status: 'found',
  plate: 'KL07AB1234',
  vehicle: {id, customer: {id: 3, name: 'Ramesh', phone: '9876543210', points_balance: 120}},
});

test('a new draft defaults to cash with no proof', () => {
  const d = createDraft({plate: 'kl 07 ab 1234'}, 'id-1');
  expect(d).toMatchObject({id: 'id-1', plate: 'KL07AB1234', mode: 'CASH', proofUri: null, isNewVehicle: true, redeem: false});
});

test('a seeded known vehicle is not new', () => {
  const d = createDraft({plate: 'KL07AB1234', vehicleId: 7, customerId: 3, name: 'Ramesh', phone: '9876543210'}, 'id');
  expect(d.isNewVehicle).toBe(false);
  expect(d.contactFromLookup).toBe(true);
});

test('a found lookup fills in the customer', () => {
  const d = draftReducer(createDraft({plate: 'KL07AB1234'}, 'id'), {type: 'lookup', result: found()});
  expect(d).toMatchObject({vehicleId: 7, customerId: 3, name: 'Ramesh', pointsBalance: 120, isNewVehicle: false});
});

test('editing the plate clears the old customer so it cannot be saved against the wrong person', () => {
  let d = draftReducer(createDraft({plate: 'KL07AB1234'}, 'id'), {type: 'lookup', result: found()});
  d = draftReducer(d, {type: 'redeem', on: true});
  d = draftReducer(d, {type: 'editPlate', plate: 'KL07AB9999'});
  expect(d).toMatchObject({vehicleId: undefined, customerId: undefined, name: '', phone: '', pointsBalance: 0, redeem: false, isNewVehicle: true});
});

test('editing the plate keeps contact details staff typed themselves', () => {
  let d = createDraft({plate: 'KL07AB1234'}, 'id');
  d = draftReducer(d, {type: 'phone', phone: '98765 43210'});
  d = draftReducer(d, {type: 'name', name: 'Sita'});
  d = draftReducer(d, {type: 'editPlate', plate: 'KL07AB9999'});
  expect(d).toMatchObject({phone: '9876543210', name: 'Sita'});
});

test('re-typing the same plate changes nothing', () => {
  const d = createDraft({plate: 'KL07AB1234'}, 'id');
  expect(draftReducer(d, {type: 'editPlate', plate: 'kl07ab1234'})).toBe(d);
});

test('a "new" lookup result marks the vehicle new; an error leaves the draft alone', () => {
  let d = draftReducer(createDraft({plate: 'KL07AB1234'}, 'id'), {type: 'lookup', result: found()});
  d = draftReducer(d, {type: 'lookup', result: {status: 'new', plate: 'KL07AB1234'}});
  expect(d.isNewVehicle).toBe(true);
  expect(d.vehicleId).toBeUndefined();
  const same = draftReducer(d, {type: 'lookup', result: {status: 'error', plate: 'X', error: {kind: 'network', message: ''}}});
  expect(same).toBe(d);
});

test('switching to cash drops the proof photo; cash cannot take one', () => {
  let d = createDraft({plate: 'KL07AB1234'}, 'id');
  d = draftReducer(d, {type: 'mode', mode: 'UPI'});
  d = draftReducer(d, {type: 'proof', uri: 'file:///p.jpg'});
  expect(d.proofUri).toBe('file:///p.jpg');
  d = draftReducer(d, {type: 'mode', mode: 'CASH'});
  expect(d.proofUri).toBeNull();
  d = draftReducer(d, {type: 'proof', uri: 'file:///q.jpg'});
  expect(d.proofUri).toBeNull();
});

test('amount keeps digits and one decimal point only', () => {
  const d = draftReducer(createDraft({plate: 'KL07AB1234'}, 'id'), {type: 'amount', amount: '₹5a0.5.5'});
  expect(d.amount).toBe('50.55');
});

test('a rejected save gives the retry a new id and keeps the entries', () => {
  let d = createDraft({plate: 'KL07AB1234'}, 'old');
  d = draftReducer(d, {type: 'amount', amount: '500'});
  d = draftReducer(d, {type: 'rejected', newId: 'new'});
  expect(d).toMatchObject({id: 'new', amount: '500', plate: 'KL07AB1234'});
});
