import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParams: any = {};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: mockParams}),
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
  useFocusEffect: (cb: () => void) => {
    const R = require('react');
    R.useEffect(cb, []);
  },
}));
jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});
const mockConfirm = jest.fn();
jest.mock('../../../ui/confirm', () => ({confirm: (...a: any[]) => mockConfirm(...a)}));
const mockApi = {
  dashboard: jest.fn(),
  customerDetail: jest.fn(),
  adjust: jest.fn(),
  listStaff: jest.fn(),
  createStaff: jest.fn(),
  updateStaff: jest.fn(),
  deactivateStaff: jest.fn(),
  activateStaff: jest.fn(),
  settings: jest.fn(),
  updateSettings: jest.fn(),
  listCustomers: jest.fn(),
};
jest.mock('../../../api/client', () => ({
  authApi: {
    listCustomers: (...a: any[]) => mockApi.listCustomers(...a),
    listStaff: (...a: any[]) => mockApi.listStaff(...a),
    createStaff: (...a: any[]) => mockApi.createStaff(...a),
    updateStaff: (...a: any[]) => mockApi.updateStaff(...a),
    deactivateStaff: (...a: any[]) => mockApi.deactivateStaff(...a),
    activateStaff: (...a: any[]) => mockApi.activateStaff(...a),
  },
  pointsApi: {
    adjust: (...a: any[]) => mockApi.adjust(...a),
    settings: (...a: any[]) => mockApi.settings(...a),
    updateSettings: (...a: any[]) => mockApi.updateSettings(...a),
  },
  transactionApi: {dashboard: (...a: any[]) => mockApi.dashboard(...a), customerDetail: (...a: any[]) => mockApi.customerDetail(...a)},
  unwrapList: (d: any) => (Array.isArray(d) ? d : d.results ?? []),
}));
jest.mock('../../../store/auth', () => ({useAuthStore: (sel: any) => sel({logout: jest.fn()})}));

import {AdminCustomerDetailScreen} from '../AdminCustomerDetailScreen';
import {AdminCustomersScreen} from '../AdminCustomersScreen';
import {AdminDashboardScreen} from '../AdminDashboardScreen';
import {AdminSettingsScreen} from '../AdminSettingsScreen';
import {AdminStaffFormScreen} from '../AdminStaffFormScreen';
import {AdminStaffScreen} from '../AdminStaffScreen';

const cleanups: Array<() => void> = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    cleanups.splice(0).forEach(fn => fn());
  });
});

const mount = async (el: React.ReactElement) => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}, mutations: {retry: false}}});
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(<QueryClientProvider client={client}>{el}</QueryClientProvider>);
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(res => setTimeout(res, 0));
  });
  cleanups.push(() => {
    r.unmount();
    client.clear();
  });
  return r;
};
const text = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root.findAll(n => (n.type as any) === 'Text').map(n => n.children.join('')).join('|');
const act = (fn: () => void | Promise<void>) => ReactTestRenderer.act(async () => void (await fn()));
const press = (r: ReactTestRenderer.ReactTestRenderer, label: string) =>
  act(() => r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0].props.onPress({}));
const type = (r: ReactTestRenderer.ReactTestRenderer, label: string, value: string) =>
  act(() => r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function')[0].props.onChangeText(value));
const settle = () => act(() => new Promise<void>(res => setTimeout(res, 0)));

const detail = {
  customer: {id: 3, name: 'Ramesh', phone: '9876543210', is_active: true},
  balance: 100,
  vehicles: [{id: 1, plate_number: 'KL07AB1234', vehicle_type: 'BIKE'}],
  transactions: [{id: 9, vehicle: {plate_number: 'KL07AB1234'}, amount: '500.00', payment_mode: 'CASH', points_earned: 5, created_at: new Date().toISOString()}],
  ledger: [{id: 1, delta: 5, type: 'EARN', note: '', created_at: new Date().toISOString()}],
};

beforeEach(() => {
  Object.values(mockApi).forEach(f => f.mockReset());
  mockConfirm.mockReset();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockParams = {};
});

describe('dashboard', () => {
  test('failure is an error with Try again, not zeros', async () => {
    mockApi.dashboard.mockRejectedValue(new Error('Network Error'));
    const t = text(await mount(<AdminDashboardScreen />));
    expect(t).toContain('Try again');
    expect(t).not.toContain('Fills today');
  });

  test('shows friendly payment names', async () => {
    mockApi.dashboard.mockResolvedValue({
      data: {
        today: {fills: 3, amount: '1500.00', points_issued: 15, points_redeemed: 0},
        top_customers: [], by_staff: [], by_payment: [{payment_mode: 'UPI', fills: 2, total_amount: '1000.00'}],
        recent_fills: [], customer_count: 8, vehicle_count: 9, staff_count: 2,
      },
    });
    const t = text(await mount(<AdminDashboardScreen />));
    expect(t).toContain('₹1,500');
    expect(t).toContain('UPI');
    expect(t).toContain('No customer activity yet.');
  });
});

describe('customers', () => {
  test('list opens the detail screen (a real stack, so back works)', async () => {
    mockApi.listCustomers.mockResolvedValue({data: [{id: 3, name: 'Ramesh', phone: '9876543210', points_balance: 100}]});
    const r = await mount(<AdminCustomersScreen />);
    await press(r, 'Ramesh, +91 98••• ••210');
    expect(mockNavigate).toHaveBeenCalledWith('CustomerDetail', expect.objectContaining({customerId: 3}));
  });

  test('a points change asks first and does nothing if cancelled', async () => {
    mockParams = {customerId: 3, name: 'Ramesh'};
    mockApi.customerDetail.mockResolvedValue({data: detail});
    mockConfirm.mockResolvedValue(false);
    const r = await mount(<AdminCustomerDetailScreen />);
    await type(r, 'Points to add or remove', '50');
    await press(r, 'Apply change');
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({message: 'Add 50 points to Ramesh?'}));
    expect(mockApi.adjust).not.toHaveBeenCalled();
  });

  test('a confirmed removal is sent, and invalid numbers never reach the server', async () => {
    mockParams = {customerId: 3, name: 'Ramesh'};
    mockApi.customerDetail.mockResolvedValue({data: detail});
    mockApi.adjust.mockResolvedValue({data: {}});
    mockConfirm.mockResolvedValue(true);
    const r = await mount(<AdminCustomerDetailScreen />);
    await type(r, 'Points to add or remove', 'abc');
    await press(r, 'Apply change');
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(text(r)).toContain('Enter a whole number');
    await type(r, 'Points to add or remove', '-20');
    await press(r, 'Apply change');
    await settle();
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({message: 'Remove 20 points from Ramesh?', destructive: true}));
    expect(mockApi.adjust).toHaveBeenCalledWith(3, -20, '');
  });

  test('detail shows friendly names, and an error with retry when it fails', async () => {
    mockParams = {customerId: 3, name: 'Ramesh'};
    mockApi.customerDetail.mockResolvedValue({data: detail});
    const t = text(await mount(<AdminCustomerDetailScreen />));
    expect(t).toContain('KL 07 AB 1234');
    expect(t).toContain('Bike');
    expect(t).toContain('Cash');
    expect(t).toContain('Points earned');
    mockApi.customerDetail.mockRejectedValue(new Error('Network Error'));
    expect(text(await mount(<AdminCustomerDetailScreen />))).toContain('Try again');
  });
});

describe('staff', () => {
  const ravi = {id: 5, username: 'ravi', name: 'Ravi K', is_active: true};

  test('list opens the form screen for add and for edit', async () => {
    mockApi.listStaff.mockResolvedValue({data: [ravi]});
    const r = await mount(<AdminStaffScreen />);
    await press(r, 'Add staff');
    expect(mockNavigate).toHaveBeenCalledWith('StaffForm');
    await press(r, 'Ravi K, @ravi');
    expect(mockNavigate).toHaveBeenCalledWith('StaffForm', {staffId: 5});
  });

  test('deactivating asks first', async () => {
    mockParams = {staffId: 5};
    mockApi.listStaff.mockResolvedValue({data: [ravi]});
    mockApi.deactivateStaff.mockResolvedValue({data: {...ravi, is_active: false}});
    mockConfirm.mockResolvedValueOnce(false);
    const r = await mount(<AdminStaffFormScreen />);
    await press(r, 'Deactivate');
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({title: 'Deactivate staff', destructive: true}));
    expect(mockApi.deactivateStaff).not.toHaveBeenCalled();
    mockConfirm.mockResolvedValueOnce(true);
    await press(r, 'Deactivate');
    await settle();
    expect(mockApi.deactivateStaff).toHaveBeenCalledWith(5);
  });

  test('a new staff member needs a 4-digit PIN, then saves and goes back', async () => {
    mockParams = undefined;
    mockApi.listStaff.mockResolvedValue({data: []});
    mockApi.createStaff.mockResolvedValue({data: {id: 6}});
    const r = await mount(<AdminStaffFormScreen />);
    await type(r, 'Username', 'sita');
    await press(r, 'SAVE STAFF');
    expect(text(r)).toContain('Enter a 4-digit PIN.');
    expect(mockApi.createStaff).not.toHaveBeenCalled();
    await type(r, 'PIN (4 digits)', '1234');
    await press(r, 'SAVE STAFF');
    await settle();
    expect(mockApi.createStaff).toHaveBeenCalledWith(expect.objectContaining({username: 'sita', pin: '1234', role: 'STAFF'}));
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('editing prefills the form from the list', async () => {
    mockParams = {staffId: 5};
    mockApi.listStaff.mockResolvedValue({data: [ravi]});
    const r = await mount(<AdminStaffFormScreen />);
    const username = r.root.findAll(n => n.props.accessibilityLabel === 'Username' && 'value' in n.props)[0];
    expect(username.props.value).toBe('ravi');
  });
});

describe('settings', () => {
  test('shows no made-up defaults while loading, then the real values', async () => {
    let resolve!: (v: any) => void;
    mockApi.settings.mockReturnValue(new Promise(res => (resolve = res)));
    const r = await mount(<AdminSettingsScreen />);
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Points earned').length).toBe(0);
    await act(() => resolve({data: {earn_points_per_rupees: 2, earn_rupees_unit: 50, redeem_rate: null, min_redeem_points: 15}}));
    await settle();
    const field = r.root.findAll(n => n.props.accessibilityLabel === 'Points earned' && 'value' in n.props)[0];
    expect(field.props.value).toBe('2');
  });

  test('a failed load is an error with Try again', async () => {
    mockApi.settings.mockRejectedValue(new Error('Network Error'));
    expect(text(await mount(<AdminSettingsScreen />))).toContain('Try again');
  });

  test('invalid settings are explained and not sent', async () => {
    mockApi.settings.mockResolvedValue({data: {earn_points_per_rupees: 1, earn_rupees_unit: 100, redeem_rate: null, min_redeem_points: 10}});
    const r = await mount(<AdminSettingsScreen />);
    await type(r, 'Points earned', '0');
    await press(r, 'SAVE SETTINGS');
    expect(text(r)).toContain('Points earned must be a whole number');
    expect(mockApi.updateSettings).not.toHaveBeenCalled();
  });
});
