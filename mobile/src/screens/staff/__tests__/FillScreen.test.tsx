import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

let mockFocusKey = 0;
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
let mockParams: any = {};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: mockParams}),
  useNavigation: () => ({replace: mockReplace, goBack: jest.fn(), navigate: mockNavigate}),
  // Runs on mount and again whenever a test bumps mockFocusKey ("coming back to the screen").
  useFocusEffect: (cb: () => void) => {
    const R = require('react');
    R.useEffect(cb, [mockFocusKey]);
  },
}));
const mockOcr = jest.fn();
jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});
const mockSave = jest.fn();
jest.mock('../../../staff/saveFill', () => ({saveFill: (...a: any[]) => mockSave(...a)}));
const mockLookup = jest.fn();
jest.mock('../../../staff/lookup', () => ({
  ...jest.requireActual('../../../staff/lookup'),
  lookupPlate: (...a: any[]) => mockLookup(...a),
}));
jest.mock('../../../api/client', () => ({
  pointsApi: {settings: () => Promise.resolve({data: {earn_points_per_rupees: 1, earn_rupees_unit: 100, redeem_rate: '1.00', min_redeem_points: 10}})},
  vehicleApi: {lookup: jest.fn()},
  authApi: {},
  transactionApi: {},
}));
jest.mock('../../../utils/camera', () => ({takePhoto: jest.fn()}));
jest.mock('../../../utils/images', () => ({compressPhoto: jest.fn()}));
jest.mock('../../../utils/ocr', () => ({
  normalizePlate: (p: string) => (p || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
  recognizePaymentFromImage: (...a: any[]) => mockOcr(...a),
}));
let mockIdCounter = 0;
jest.mock('../../../utils/offlineQueue', () => ({newFillId: () => `fill-${++mockIdCounter}`}));

import {setPendingProof} from '../../../staff/proofResult';
import {FillScreen} from '../FillScreen';

const flush = () => ReactTestRenderer.act(async () => {
  await Promise.resolve();
});

async function mount() {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(<FillScreen />);
  });
  await flush();
  return r;
}

const allText = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as any) === 'Text')
    .map(n => n.children.join(''))
    .join('|');

const press = async (r: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const node = r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  await ReactTestRenderer.act(async () => {
    node.props.onPress({});
  });
};

beforeEach(() => {
  mockFocusKey = 0;
  mockReplace.mockClear();
  mockNavigate.mockClear();
  mockOcr.mockReset();
  setPendingProof(null);
  mockIdCounter = 0;
  mockSave.mockReset();
  mockLookup.mockReset();
  mockParams = {plate: 'KL07AB1234', vehicleId: 7, customerId: 3, name: 'Ramesh', phone: '9876543210', pointsBalance: 0, isNew: false};
});

test('an existing customer sees their name first and Cash is the default', async () => {
  const r = await mount();
  const text = allText(r);
  expect(text).toContain('Ramesh');
  expect(text).toContain('ENTER AMOUNT');
  expect(mockLookup).not.toHaveBeenCalled();
  await press(r, 'Amount ₹500');
  expect(allText(r)).toContain('SAVE ₹500 CASH');
  // no payment photo button for cash
  expect(allText(r)).not.toContain('Add payment photo');
});

test('UPI offers an optional photo; switching back to cash hides it', async () => {
  const r = await mount();
  await press(r, 'Paid by UPI');
  expect(allText(r)).toContain('Add payment photo (optional)');
  await press(r, 'Paid by CASH');
  expect(allText(r)).not.toContain('Add payment photo');
});

test('saving cash 500 calls saveFill with a CASH draft and moves to the success screen', async () => {
  mockSave.mockResolvedValue({
    kind: 'saved',
    transaction: {amount: '500.00', points_earned: 5, payment_mode: 'CASH', customer: {name: 'Ramesh', phone: '9876543210'}, customer_balance: 5},
  });
  const r = await mount();
  await press(r, 'Amount ₹500');
  await press(r, 'SAVE ₹500 CASH');
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave.mock.calls[0][0]).toMatchObject({id: 'fill-1', mode: 'CASH', amount: '500', plate: 'KL07AB1234', vehicleId: 7});
  expect(mockReplace).toHaveBeenCalledWith('FillSuccess', expect.objectContaining({amount: '500.00', pointsEarned: 5, paymentMode: 'CASH'}));
});

test('an offline save goes to the success screen marked offline with 0 points', async () => {
  mockSave.mockResolvedValue({kind: 'queued'});
  const r = await mount();
  await press(r, 'Amount ₹200');
  await press(r, 'SAVE ₹200 CASH');
  expect(mockReplace).toHaveBeenCalledWith('FillSuccess', expect.objectContaining({offline: true, pointsEarned: 0}));
});

test('a rejected save stays on the screen, shows the reason, keeps the amount and uses a new id for the retry', async () => {
  mockSave.mockResolvedValueOnce({kind: 'rejected', message: 'Insufficient points'});
  mockSave.mockResolvedValueOnce({kind: 'queued'});
  const r = await mount();
  await press(r, 'Amount ₹500');
  await press(r, 'SAVE ₹500 CASH');
  expect(mockReplace).not.toHaveBeenCalled();
  expect(allText(r)).toContain('Insufficient points');
  expect(allText(r)).toContain('SAVE ₹500 CASH');
  await press(r, 'SAVE ₹500 CASH');
  expect(mockSave.mock.calls[0][0].id).toBe('fill-1');
  expect(mockSave.mock.calls[1][0].id).toBe('fill-2');
});

test('a new vehicle asks for the customer mobile and will not save without it', async () => {
  mockParams = {plate: 'KL07AB1234', isNew: true};
  const r = await mount();
  expect(allText(r)).toContain('NEW VEHICLE');
  expect(allText(r)).toContain('Customer mobile');
  await press(r, 'Amount ₹500');
  expect(allText(r)).toContain('CHECK DETAILS');
  expect(allText(r)).toMatch(/10-digit mobile/);
  await press(r, 'CHECK DETAILS');
  expect(mockSave).not.toHaveBeenCalled();
});

test('the payment photo button opens the in-app proof camera', async () => {
  const r = await mount();
  await press(r, 'Paid by UPI');
  await press(r, 'Add payment photo (optional)');
  expect(mockNavigate).toHaveBeenCalledWith('ProofCamera');
});

test('a photo from the proof camera is attached and suggests the amount when none is typed', async () => {
  mockOcr.mockResolvedValue({amount: '750', paymentMode: 'UPI'});
  setPendingProof('file:///proof.jpg');
  const r = await mount();
  await flush();
  await press(r, 'Paid by UPI');
  expect(allText(r)).toContain('Payment photo attached');
  expect(allText(r)).toContain('SAVE ₹750 UPI');
  expect(allText(r)).toContain('Read from the payment photo');
});

test('a photo does not overwrite an amount staff already typed', async () => {
  mockOcr.mockResolvedValue({amount: '750'});
  const r = await mount();
  await press(r, 'Amount ₹500');
  await press(r, 'Paid by UPI');
  setPendingProof('file:///proof.jpg');
  // coming back to the screen
  mockFocusKey += 1;
  await ReactTestRenderer.act(async () => {
    r.update(<FillScreen />);
  });
  await flush();
  expect(allText(r)).toContain('Payment photo attached');
  expect(allText(r)).toContain('SAVE ₹500 UPI');
});
