import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 24, left: 0, right: 0})}));

import {TabBar} from '../TabBar';

const routes = ['Dashboard', 'Customers', 'Staff', 'Rewards', 'Settings'].map(name => ({key: `${name}-k`, name, params: undefined}));

const setup = (index: number) => {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({defaultPrevented: false}));
  const descriptors = Object.fromEntries(routes.map(r => [r.key, {options: {tabBarIcon: () => null}}]));
  const props = {state: {index, routes}, descriptors, navigation: {navigate, emit}, insets: {top: 0, bottom: 0, left: 0, right: 0}} as any;
  let r!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(<TabBar {...props} />);
  });
  return {r, navigate, emit};
};

const tab = (r: ReactTestRenderer.ReactTestRenderer, label: string) =>
  r.root.find(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');

test('every label is shown whole and the current tab is marked selected', () => {
  const {r} = setup(0);
  const labels = r.root.findAll(n => (n.type as any) === 'Text').map(n => n.children.join(''));
  expect(labels).toEqual(['Dashboard', 'Customers', 'Staff', 'Rewards', 'Settings']);
  expect(tab(r, 'Dashboard').props.accessibilityState).toEqual({selected: true});
  expect(tab(r, 'Customers').props.accessibilityState).toEqual({selected: false});
  ReactTestRenderer.act(() => r.unmount());
});

test('a tapped tab looks selected at once, then navigates on the next frame', async () => {
  const {r, navigate} = setup(0);
  ReactTestRenderer.act(() => tab(r, 'Rewards').props.onPress());
  expect(tab(r, 'Rewards').props.accessibilityState).toEqual({selected: true});
  expect(tab(r, 'Dashboard').props.accessibilityState).toEqual({selected: false});
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(res => setTimeout(res, 50));
  });
  expect(navigate).toHaveBeenCalledWith('Rewards', undefined);
  ReactTestRenderer.act(() => r.unmount());
});

test('tapping the current tab only emits tabPress (so its stack pops to the top)', async () => {
  const {r, navigate, emit} = setup(0);
  ReactTestRenderer.act(() => tab(r, 'Rewards').props.onPress());
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(res => setTimeout(res, 50));
  });
  expect(navigate).toHaveBeenCalledWith('Rewards', undefined);
  ReactTestRenderer.act(() => tab(r, 'Dashboard').props.onPress());
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(emit).toHaveBeenCalledWith({type: 'tabPress', target: 'Dashboard-k', canPreventDefault: true});
  ReactTestRenderer.act(() => r.unmount());
});
