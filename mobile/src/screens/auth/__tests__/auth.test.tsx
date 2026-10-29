import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn(), canGoBack: () => true}),
}));
jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});
const mockLogin = jest.fn();
const mockApi = {requestOtp: jest.fn(), verifyOtp: jest.fn(), pinLogin: jest.fn()};
jest.mock('../../../api/client', () => ({
  authApi: {
    requestOtp: (...a: any[]) => mockApi.requestOtp(...a),
    verifyOtp: (...a: any[]) => mockApi.verifyOtp(...a),
    pinLogin: (...a: any[]) => mockApi.pinLogin(...a),
  },
}));
jest.mock('../../../store/auth', () => ({
  useAuthStore: (sel: any) => sel({login: mockLogin, setAuthEntry: jest.fn()}),
}));

import {LoginScreen} from '../LoginScreen';
import {StaffLoginScreen} from '../StaffLoginScreen';

const act = (fn: () => void | Promise<void>) => ReactTestRenderer.act(async () => void (await fn()));
const mount = async (el: React.ReactElement) => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    r = ReactTestRenderer.create(el);
  });
  return r;
};
const text = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root.findAll(n => (n.type as any) === 'Text').map(n => n.children.join('')).join('|');
const press = (r: ReactTestRenderer.ReactTestRenderer, label: string) =>
  act(() => r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0].props.onPress({}));
const type = (r: ReactTestRenderer.ReactTestRenderer, label: string, value: string) =>
  act(() => r.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function')[0].props.onChangeText(value));

beforeEach(() => {
  Object.values(mockApi).forEach(f => f.mockReset());
  mockLogin.mockReset();
  mockNavigate.mockClear();
});

test('customer login: a short number is explained and nothing is sent', async () => {
  const r = await mount(<LoginScreen />);
  await type(r, 'Mobile number', '98765');
  await press(r, 'Continue');
  expect(text(r)).toContain('Enter your 10-digit mobile number.');
  expect(mockApi.requestOtp).not.toHaveBeenCalled();
});

test('customer login: existing customer goes phone, OTP, logged in', async () => {
  mockApi.requestOtp.mockResolvedValue({data: {is_new: false}});
  mockApi.verifyOtp.mockResolvedValue({data: {access: 'tok', user: {id: 1}}});
  const r = await mount(<LoginScreen />);
  await type(r, 'Mobile number', '9876543210');
  await press(r, 'Continue');
  expect(text(r)).toContain('OTP sent to +91 9876543210');
  await type(r, 'OTP', '123456');
  await press(r, 'Verify');
  expect(mockApi.verifyOtp).toHaveBeenCalledWith('9876543210', '123456', undefined);
  expect(mockLogin).toHaveBeenCalledWith('tok', {id: 1});
});

test('customer login: a new customer is asked for a name before the account is made', async () => {
  mockApi.requestOtp.mockResolvedValue({data: {is_new: true}});
  mockApi.verifyOtp.mockResolvedValue({data: {access: 'tok', user: {id: 2}}});
  const r = await mount(<LoginScreen />);
  await type(r, 'Mobile number', '9876543210');
  await press(r, 'Continue');
  await type(r, 'OTP', '1234');
  await press(r, 'Verify');
  expect(mockApi.verifyOtp).not.toHaveBeenCalled();
  expect(text(r)).toContain('New customer');
  await press(r, 'Create account');
  expect(text(r)).toContain('Please enter your name.');
  await type(r, 'Your name', 'Sita');
  await press(r, 'Create account');
  expect(mockApi.verifyOtp).toHaveBeenCalledWith('9876543210', '1234', 'Sita');
});

test('customer login: a server error is shown in words', async () => {
  mockApi.requestOtp.mockRejectedValue({response: {status: 400, data: {detail: 'Too many attempts. Try later.'}}});
  const r = await mount(<LoginScreen />);
  await type(r, 'Mobile number', '9876543210');
  await press(r, 'Continue');
  expect(text(r)).toContain('Too many attempts. Try later.');
});

test('customer login: no signal says so, never a raw error', async () => {
  mockApi.requestOtp.mockRejectedValue(new Error('Network Error'));
  const r = await mount(<LoginScreen />);
  await type(r, 'Mobile number', '9876543210');
  await press(r, 'Continue');
  expect(text(r)).toContain('No connection to the server');
});

test('staff login: needs a 4-digit PIN, then logs in', async () => {
  mockApi.pinLogin.mockResolvedValue({data: {access: 'tok', user: {id: 5}}});
  const r = await mount(<StaffLoginScreen />);
  await type(r, 'Username', 'ravi');
  await type(r, 'PIN', '12');
  await press(r, 'Login');
  expect(text(r)).toContain('Enter your username and 4-digit PIN.');
  await type(r, 'PIN', '1234');
  await press(r, 'Login');
  expect(mockApi.pinLogin).toHaveBeenCalledWith('ravi', '1234');
  expect(mockLogin).toHaveBeenCalledWith('tok', {id: 5});
});

test('staff login: a wrong PIN shows the server message', async () => {
  mockApi.pinLogin.mockRejectedValue({response: {status: 401, data: {detail: 'Invalid username or PIN'}}});
  const r = await mount(<StaffLoginScreen />);
  await type(r, 'Username', 'ravi');
  await type(r, 'PIN', '0000');
  await press(r, 'Login');
  expect(text(r)).toContain('Invalid username or PIN');
});

test('staff login: the eye button shows and hides the PIN', async () => {
  const r = await mount(<StaffLoginScreen />);
  const pinHidden = () =>
    r.root.findAll(n => n.props.accessibilityLabel === 'PIN' && typeof n.props.onChangeText === 'function')[0].props.secureTextEntry;
  expect(pinHidden()).toBe(true);
  await press(r, 'Show PIN');
  expect(pinHidden()).toBe(false);
  await press(r, 'Hide PIN');
  expect(pinHidden()).toBe(true);
});
