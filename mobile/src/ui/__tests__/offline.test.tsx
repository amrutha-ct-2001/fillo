jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {addEventListener: jest.fn(() => jest.fn()), refresh: jest.fn(() => Promise.resolve())},
}));

import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {blocksWhenOffline, isOffline, OfflineScreen} from '../OfflineScreen';

test('no network at all is offline, in any build', () => {
  expect(isOffline({isConnected: false, isInternetReachable: null}, true)).toBe(true);
  expect(isOffline({isConnected: false, isInternetReachable: null}, false)).toBe(true);
});

test('a network without internet is offline only outside debug builds', () => {
  // Debug builds reach the dev server over the LAN, so no internet is fine there.
  expect(isOffline({isConnected: true, isInternetReachable: false}, true)).toBe(false);
  expect(isOffline({isConnected: true, isInternetReachable: false}, false)).toBe(true);
});

test('an unknown internet check is not treated as offline', () => {
  expect(isOffline({isConnected: true, isInternetReachable: null}, false)).toBe(false);
  expect(isOffline({isConnected: null, isInternetReachable: null}, false)).toBe(false);
});

test('everyone is covered when offline, including staff on home, scan and search', () => {
  expect(blocksWhenOffline('CUSTOMER', 'Home')).toBe(true);
  expect(blocksWhenOffline('ADMIN', 'Dashboard')).toBe(true);
  expect(blocksWhenOffline(undefined, 'Login')).toBe(true);
  expect(blocksWhenOffline('STAFF', 'StaffHome')).toBe(true);
  expect(blocksWhenOffline('STAFF', 'ScanPlate')).toBe(true);
  expect(blocksWhenOffline('STAFF', 'FindCustomer')).toBe(true);
});

test('staff in the middle of a fill are never covered, so Save can keep the fill on the phone', () => {
  expect(blocksWhenOffline('STAFF', 'Fill')).toBe(false);
  expect(blocksWhenOffline('STAFF', 'ProofCamera')).toBe(false);
  expect(blocksWhenOffline('STAFF', 'FillSuccess')).toBe(false);
  // only staff: a customer screen with the same name would still be covered
  expect(blocksWhenOffline('CUSTOMER', 'Fill')).toBe(true);
});

test('the offline screen says so and offers Try again', async () => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    r = ReactTestRenderer.create(<OfflineScreen />);
  });
  const text = r.root
    .findAll(n => (n.type as any) === 'Text')
    .map(n => n.children.join(''))
    .join('|');
  expect(text).toContain("You're offline");
  expect(text).toContain('NO CONNECTION');
  expect(text).toContain('Try again');
  expect(text).not.toContain('Fills already saved on this phone');
});

test('staff are told their saved fills are safe', async () => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    r = ReactTestRenderer.create(<OfflineScreen staff />);
  });
  const text = r.root
    .findAll(n => (n.type as any) === 'Text')
    .map(n => n.children.join(''))
    .join('|');
  expect(text).toContain('Fills already saved on this phone are safe and will upload by themselves.');
});
