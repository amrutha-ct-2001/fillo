import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockReplace = jest.fn();
let mockParams: any = {};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: mockParams}),
  useNavigation: () => ({replace: mockReplace, goBack: jest.fn(), navigate: jest.fn(), popToTop: jest.fn(), reset: jest.fn()}),
  useFocusEffect: (cb: () => void) => {
    const R = require('react');
    R.useEffect(cb, [cb]);
  },
}));
jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});
const mockLookupPlate = jest.fn();
const mockLookupPhone = jest.fn();
jest.mock('../../../staff/lookup', () => ({
  lookupPlate: (...a: any[]) => mockLookupPlate(...a),
  lookupPhone: (...a: any[]) => mockLookupPhone(...a),
}));
const mockDetail = jest.fn();
jest.mock('../../../api/client', () => ({transactionApi: {customerDetail: (...a: any[]) => mockDetail(...a)}}));

import {FillSuccessScreen} from '../FillSuccessScreen';
import {FindCustomerScreen} from '../FindCustomerScreen';
import {StaffCustomerHistoryScreen} from '../StaffCustomerHistoryScreen';

const mount = async (el: React.ReactElement) => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(el);
  });
  return r;
};
const text = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root.findAll(n => (n.type as any) === 'Text').map(n => n.children.join('')).join('|');
const press = async (r: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const node = r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  await ReactTestRenderer.act(async () => {
    node.props.onPress({});
  });
};
const type = async (r: ReactTestRenderer.ReactTestRenderer, label: string, value: string) => {
  const node = r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function')[0];
  await ReactTestRenderer.act(async () => {
    node.props.onChangeText(value);
  });
};

beforeEach(() => {
  mockReplace.mockClear();
  mockLookupPlate.mockReset();
  mockLookupPhone.mockReset();
  mockDetail.mockReset();
});

describe('FillSuccessScreen', () => {
  test('online: shows earned points', async () => {
    mockParams = {amount: '500.00', pointsEarned: 5, balance: 125, plate: 'KL07AB1234', paymentMode: 'CASH', customerName: 'Ramesh', customerPhone: '9876543210'};
    const t = text(await mount(<FillSuccessScreen />));
    expect(t).toContain('Fill saved');
    expect(t).toContain('+5 points earned · balance 125');
    expect(t).toContain('₹500');
    expect(t).toContain('NEXT VEHICLE');
    expect(t).not.toMatch(/Bay 03|Meter Seal/);
  });

  test('offline: says saved on the phone and never +0 points', async () => {
    mockParams = {amount: '500', pointsEarned: 0, balance: 0, plate: 'KL07AB1234', offline: true, paymentMode: 'CASH'};
    const t = text(await mount(<FillSuccessScreen />));
    expect(t).toContain('Saved on this phone');
    expect(t).toContain('Points will be added after sync');
    expect(t).not.toMatch(/\+0/);
  });
});

describe('FindCustomerScreen', () => {
  const veh = (id: number, plate: string): any => ({id, plate_number: plate, vehicle_type: 'BIKE'});

  test('plate not registered goes to Fill as a new vehicle', async () => {
    mockParams = undefined;
    mockLookupPlate.mockResolvedValue({status: 'new', plate: 'KL07AB1234'});
    const r = await mount(<FindCustomerScreen />);
    await type(r, 'Plate number', 'kl07ab1234');
    await press(r, 'FIND');
    expect(mockReplace).toHaveBeenCalledWith('Fill', {plate: 'KL07AB1234', isNew: true});
  });

  test('a network error shows Try again and does NOT open Fill as a new vehicle', async () => {
    mockParams = undefined;
    mockLookupPlate.mockResolvedValue({status: 'error', plate: 'KL07AB1234', error: {kind: 'network', message: 'No connection to the server.'}});
    const r = await mount(<FindCustomerScreen />);
    await type(r, 'Plate number', 'KL07AB1234');
    await press(r, 'FIND');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(text(r)).toContain('No connection to the server.');
    expect(text(r)).toContain('Try again');
  });

  test('a phone with several vehicles lists them all and opens the chosen one', async () => {
    mockParams = {mode: 'phone'};
    mockLookupPhone.mockResolvedValue({
      status: 'found',
      phone: '9876543210',
      customer: {id: 3, name: 'Ramesh', phone: '9876543210', points_balance: 40},
      vehicles: [veh(1, 'KL07AB1234'), veh(2, 'KL01CD5678')],
    });
    const r = await mount(<FindCustomerScreen />);
    await type(r, 'Customer mobile', '9876543210');
    await press(r, 'FIND');
    expect(mockReplace).not.toHaveBeenCalled();
    await press(r, 'Fill KL01CD5678');
    expect(mockReplace).toHaveBeenCalledWith('Fill', expect.objectContaining({plate: 'KL01CD5678', vehicleId: 2, customerId: 3, isNew: false}));
  });

  test('a phone with one vehicle goes straight to Fill', async () => {
    mockParams = {mode: 'phone'};
    mockLookupPhone.mockResolvedValue({status: 'found', phone: '9876543210', customer: {id: 3, name: 'R', phone: '9876543210'}, vehicles: [veh(1, 'KL07AB1234')]});
    const r = await mount(<FindCustomerScreen />);
    await type(r, 'Customer mobile', '9876543210');
    await press(r, 'FIND');
    expect(mockReplace).toHaveBeenCalledWith('Fill', expect.objectContaining({vehicleId: 1}));
  });
});

describe('StaffCustomerHistoryScreen', () => {
  beforeEach(() => {
    mockParams = {customerId: 3, name: 'Ramesh', phone: '9876543210'};
  });

  test('a failed load shows an error with Try again, not "No fills yet"', async () => {
    mockDetail.mockRejectedValue(new Error('Network Error'));
    const t = text(await mount(<StaffCustomerHistoryScreen />));
    expect(t).toContain('Try again');
    expect(t).not.toContain('No fills yet');
  });

  test('shows fills with friendly labels', async () => {
    mockDetail.mockResolvedValue({
      data: {
        customer: {id: 3, name: 'Ramesh', phone: '9876543210'},
        balance: 40,
        vehicles: [],
        transactions: [{id: 1, vehicle: {plate_number: 'KL07AB1234'}, amount: '1500.00', payment_mode: 'UPI', points_earned: 15, created_at: new Date().toISOString()}],
      },
    });
    const t = text(await mount(<StaffCustomerHistoryScreen />));
    expect(t).toContain('₹1,500');
    expect(t).toContain('UPI');
    expect(t).toContain('1 fill');
  });
});
