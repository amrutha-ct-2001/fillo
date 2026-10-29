jest.mock('@react-native-community/netinfo', () => ({__esModule: true, default: {fetch: jest.fn()}}));
jest.mock('../../api/client', () => ({transactionApi: {create: jest.fn()}}));
jest.mock('../../utils/offlineQueue', () => ({enqueueOfflineFill: jest.fn()}));

import {createDraft, draftReducer, FillDraft} from '../draft';
import {saveFill, SaveDeps, toFormData, toOfflineFill} from '../saveFill';

const base = (): FillDraft => {
  let d = createDraft({plate: 'KL07AB1234', vehicleId: 7, customerId: 3, name: 'Ramesh', phone: '9876543210'}, 'fill-1');
  d = draftReducer(d, {type: 'amount', amount: '500'});
  return d;
};
const NOW = new Date('2026-10-08T10:00:00Z');
const deps = (over: Partial<SaveDeps> = {}): SaveDeps => ({
  isOnline: async () => true,
  create: jest.fn().mockResolvedValue({data: {id: 1, amount: '500.00'}}),
  enqueue: jest.fn().mockResolvedValue(undefined),
  now: () => NOW,
  ...over,
});
const httpError = (status: number, data?: unknown) => ({response: {status, data}});

test('online and accepted: saved, nothing queued, client_id is the draft id', async () => {
  const d = deps();
  const r = await saveFill(base(), 0, d);
  expect(r.kind).toBe('saved');
  expect(d.enqueue).not.toHaveBeenCalled();
  const form: any = (d.create as jest.Mock).mock.calls[0][0];
  expect(form.get('client_id')).toBe('fill-1');
  expect(form.get('payment_mode')).toBe('CASH');
  expect(form.get('vehicle_id')).toBe('7');
});

test('offline: queued with the vehicle id and the device time, no request made', async () => {
  const d = deps({isOnline: async () => false});
  const r = await saveFill(base(), 20, d);
  expect(r.kind).toBe('queued');
  expect(d.create).not.toHaveBeenCalled();
  const item = (d.enqueue as jest.Mock).mock.calls[0][0];
  expect(item).toMatchObject({id: 'fill-1', createdAt: NOW.toISOString()});
  expect(item.payload).toMatchObject({vehicle_id: 7, points_to_redeem: 20, payment_mode: 'CASH'});
});

test('a network failure while online queues the fill', async () => {
  const d = deps({create: jest.fn().mockRejectedValue(new Error('Network Error'))});
  expect((await saveFill(base(), 0, d)).kind).toBe('queued');
  expect(d.enqueue).toHaveBeenCalledTimes(1);
});

test('a 5xx queues the fill', async () => {
  const d = deps({create: jest.fn().mockRejectedValue(httpError(502))});
  expect((await saveFill(base(), 0, d)).kind).toBe('queued');
});

test('a 400 is rejected in plain words and is never queued', async () => {
  const d = deps({create: jest.fn().mockRejectedValue(httpError(400, {detail: 'Insufficient points'}))});
  const r = await saveFill(base(), 50, d);
  expect(r).toEqual({kind: 'rejected', message: 'Insufficient points'});
  expect(d.enqueue).not.toHaveBeenCalled();
});

test('if the phone cannot store the fill, it says so instead of pretending it is saved', async () => {
  const d = deps({isOnline: async () => false, enqueue: jest.fn().mockRejectedValue(new Error('disk full'))});
  const r = await saveFill(base(), 0, d);
  expect(r.kind).toBe('rejected');
});

test('a cash fill never sends a payment photo; a UPI fill does', () => {
  let d = base();
  d = {...d, proofUri: 'file:///leftover.jpg'};
  expect(toOfflineFill(d, 0, NOW).paymentProofUri).toBeUndefined();
  d = draftReducer({...d, proofUri: null}, {type: 'mode', mode: 'UPI'});
  d = draftReducer(d, {type: 'proof', uri: 'file:///p.jpg'});
  const form: any = toFormData(toOfflineFill(d, 0, NOW));
  expect(form.get('payment_mode')).toBe('UPI');
  expect(form.get('payment_proof')).toBeTruthy();
});
