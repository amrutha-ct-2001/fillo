import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const R = require('react');
    R.useEffect(cb, []);
  },
  useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn()}),
}));
jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});
const mockPoints = jest.fn();
const mockRewards = jest.fn();
const mockMine = jest.fn();
const mockCheck = jest.fn();
const mockUse = jest.fn();
jest.mock('../../../api/client', () => ({
  pointsApi: {me: (...a: any[]) => mockPoints(...a)},
  rewardApi: {
    list: (...a: any[]) => mockRewards(...a),
    myVouchers: (...a: any[]) => mockMine(...a),
    redeem: jest.fn(),
    checkVoucher: (...a: any[]) => mockCheck(...a),
    useVoucher: (...a: any[]) => mockUse(...a),
  },
}));
jest.mock('../../../store/auth', () => {
  const state = {user: {id: 1, name: 'Sita', phone: '9876543210', role: 'CUSTOMER', points_balance: 50}};
  return {useAuthStore: (sel: any) => sel(state)};
});

import {cleanVoucherCode, VerifyVoucherScreen} from '../../staff/VerifyVoucherScreen';
import {CustomerRewardsScreen} from '../CustomerRewardsScreen';

const cleanups: Array<() => void> = [];
afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    cleanups.splice(0).forEach(fn => fn());
  });
});

const mount = async (el: React.ReactElement) => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
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
const press = async (r: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const target = r.root.find(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
    await new Promise<void>(res => setTimeout(res, 0));
  });
};

const wash = {id: 1, title: 'Free Car Wash', description: 'Exterior wash', points_cost: 60, stock: null, is_active: true};
const coffee = {id: 2, title: 'Coffee on Us', description: '', points_cost: 30, stock: 4, is_active: true};

beforeEach(() => {
  [mockPoints, mockRewards, mockMine, mockCheck, mockUse].forEach(m => m.mockReset());
  mockPoints.mockResolvedValue({data: {balance: 50, settings: {}, ledger: []}});
  mockMine.mockResolvedValue({data: []});
});

test('rewards: shows balance, the catalog, and how many more points a reward needs', async () => {
  mockRewards.mockResolvedValue({data: [coffee, wash]});
  const t = text(await mount(<CustomerRewardsScreen />));
  expect(t).toContain('50');
  expect(t).toContain('Coffee on Us');
  expect(t).toContain('4 left');
  expect(t).toContain('10 more points needed');
});

test('rewards: a failed catalog load is an error with Try again, not "No rewards yet"', async () => {
  mockRewards.mockRejectedValue(new Error('Network Error'));
  const t = text(await mount(<CustomerRewardsScreen />));
  expect(t).toContain('Try again');
  expect(t).not.toContain('No rewards yet');
});

test('rewards: my vouchers show the code and a friendly status', async () => {
  mockRewards.mockResolvedValue({data: [wash]});
  mockMine.mockResolvedValue({
    data: [{id: 9, code: 'K7M2QX', reward: wash, points_spent: 60, status: 'PENDING', created_at: new Date().toISOString(), used_at: null}],
  });
  const r = await mount(<CustomerRewardsScreen />);
  expect(text(r)).toContain('My vouchers (1)');
  await press(r, 'My vouchers (1)');
  const t = text(r);
  expect(t).toContain('K7M2QX');
  expect(t).toContain('Ready to use');
  expect(t).not.toContain('PENDING');
});

test('voucher codes are cleaned to capitals without spaces', () => {
  expect(cleanVoucherCode(' k7m-2qx ')).toBe('K7M2QX');
});

test('staff: checking a voucher shows the reward and customer, then marks it used', async () => {
  const voucher = {
    id: 9,
    code: 'K7M2QX',
    reward: wash,
    points_spent: 60,
    status: 'PENDING',
    customer_name: 'Sita',
    customer_phone: '9876543210',
    verified_by_name: null,
    created_at: new Date().toISOString(),
    used_at: null,
  };
  mockCheck.mockResolvedValue({data: voucher});
  mockUse.mockResolvedValue({data: {...voucher, status: 'USED', used_at: new Date().toISOString(), verified_by_name: 'Rajesh'}});
  const r = await mount(<VerifyVoucherScreen />);
  const input = r.root.find(n => n.props.accessibilityLabel === 'Voucher code' && typeof n.props.onChangeText === 'function');
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText('k7m2qx');
  });
  await press(r, 'CHECK CODE');
  expect(mockCheck).toHaveBeenCalledWith('K7M2QX');
  expect(text(r)).toContain('Free Car Wash');
  expect(text(r)).toContain('Ready to use');

  await press(r, 'MARK AS USED');
  expect(mockUse).toHaveBeenCalledWith('K7M2QX');
  expect(text(r)).toContain('Used');
  expect(text(r)).toContain('by Rajesh');
});

test('staff: an unknown code says so', async () => {
  mockCheck.mockRejectedValue({isAxiosError: true, response: {status: 404, data: {detail: 'Voucher not found'}}});
  const r = await mount(<VerifyVoucherScreen />);
  const input = r.root.find(n => n.props.accessibilityLabel === 'Voucher code' && typeof n.props.onChangeText === 'function');
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText('ZZZZZZ');
  });
  await press(r, 'CHECK CODE');
  expect(text(r)).toContain('Could not check');
});
