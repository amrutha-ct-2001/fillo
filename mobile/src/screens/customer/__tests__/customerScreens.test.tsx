import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

jest.mock('@react-navigation/native', () => ({
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
jest.mock('react-native-qrcode-svg', () => () => null);
const mockPoints = jest.fn();
const mockFills = jest.fn();
const mockVehicles = jest.fn();
jest.mock('../../../api/client', () => ({
  pointsApi: {me: (...a: any[]) => mockPoints(...a)},
  transactionApi: {mine: (...a: any[]) => mockFills(...a)},
  vehicleApi: {mine: (...a: any[]) => mockVehicles(...a)},
  authApi: {updateMe: jest.fn()},
}));
jest.mock('../../../store/auth', () => {
  const state = {user: {id: 1, name: 'Sita', phone: '9876543210', role: 'CUSTOMER', points_balance: 12}, refreshMe: jest.fn(), logout: jest.fn()};
  return {useAuthStore: (sel: any) => sel(state)};
});

import {CustomerHistoryScreen} from '../CustomerHistoryScreen';
import {CustomerHomeScreen} from '../CustomerHomeScreen';
import {CustomerProfileScreen} from '../CustomerProfileScreen';
import {CustomerVehiclesScreen} from '../CustomerVehiclesScreen';

// Everything mounted by a test is torn down afterwards, otherwise the query
// cache timers and skeleton animation keep Jest from exiting.
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

beforeEach(() => {
  mockPoints.mockReset();
  mockFills.mockReset();
  mockVehicles.mockReset();
});

test('history: a failed load is an error with Try again, never "No fills yet"', async () => {
  mockFills.mockRejectedValue(new Error('Network Error'));
  const t = text(await mount(<CustomerHistoryScreen />));
  expect(t).toContain('Try again');
  expect(t).not.toContain('No fills yet');
});

test('history: a real empty result says so', async () => {
  mockFills.mockResolvedValue({data: []});
  expect(text(await mount(<CustomerHistoryScreen />))).toContain('No fills yet');
});

test('history: rows use friendly payment labels and rupee grouping', async () => {
  mockFills.mockResolvedValue({
    data: [{id: 1, vehicle: {plate_number: 'KL07AB1234'}, amount: '1500.00', payment_mode: 'UPI', points_earned: 15, created_at: new Date().toISOString()}],
  });
  const t = text(await mount(<CustomerHistoryScreen />));
  expect(t).toContain('KL07AB1234');
  expect(t).toContain('₹1,500');
  expect(t).toContain('+15 pts');
});

test('vehicles: failure shows an error, success shows a formatted plate and a friendly type', async () => {
  mockVehicles.mockRejectedValueOnce(new Error('Network Error'));
  expect(text(await mount(<CustomerVehiclesScreen />))).toContain('Try again');
  mockVehicles.mockResolvedValue({data: [{id: 1, plate_number: 'KL07AB1234', vehicle_type: 'BIKE', colour: 'Red'}]});
  const t = text(await mount(<CustomerVehiclesScreen />));
  expect(t).toContain('KL 07 AB 1234');
  expect(t).toContain('Bike · Red');
});

test('home: shows the balance and friendly ledger names, not raw enums', async () => {
  mockPoints.mockResolvedValue({
    data: {
      balance: 125,
      settings: {earn_points_per_rupees: 1, earn_rupees_unit: 100, redeem_rate: null, min_redeem_points: 10},
      ledger: [{id: 1, delta: 5, type: 'EARN', note: '', created_at: new Date().toISOString()}, {id: 2, delta: -20, type: 'REDEEM', note: '', created_at: new Date().toISOString()}],
    },
  });
  const t = text(await mount(<CustomerHomeScreen />));
  expect(t).toContain('Hi Sita');
  expect(t).toContain('125');
  expect(t).toContain('Points earned');
  expect(t).toContain('Points used');
  expect(t).not.toMatch(/\bEARN\b|\bREDEEM\b/);
  expect(t).toContain('using points is coming soon');
});

test('home: with no connection it shows the cached balance and an error with retry', async () => {
  mockPoints.mockRejectedValue(new Error('Network Error'));
  const t = text(await mount(<CustomerHomeScreen />));
  expect(t).toContain('12');
  expect(t).toContain('Try again');
});

test('profile: no internal role text, has Log out', async () => {
  const t = text(await mount(<CustomerProfileScreen />));
  expect(t).not.toMatch(/Role|CUSTOMER/);
  expect(t).toContain('Log out');
  expect(t).toContain('+91 98765 43210');
});
