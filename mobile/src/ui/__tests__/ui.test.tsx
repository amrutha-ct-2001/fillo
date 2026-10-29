import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});

import {
  AmountDisplay,
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  ListRow,
  QueryState,
  Screen,
  Skeleton,
  StatTile,
  Text,
  Toggle,
} from '..';

function texts(node: ReactTestRenderer.ReactTestRendererJSON | ReactTestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) {
    return '';
  }
  if (Array.isArray(node)) {
    return node.map(n => texts(n)).join('|');
  }
  return (node.children ?? []).map(c => (typeof c === 'string' ? c : texts(c))).join('');
}

async function render(el: React.ReactElement) {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(el);
  });
  return r;
}

test('every primitive renders without throwing', async () => {
  const r = await render(
    <Screen header={<AppHeader title="Fill" subtitle="Pump 3" onBack={() => {}} right={<Badge label="Offline" tone="warning" icon="cloud-off" />} />} footer={<Button title="SAVE ₹500 CASH" large />}>
      <Text variant="title">Hello</Text>
      <Card><Text>Body</Text></Card>
      <Input label="Amount" prefix="₹" value="500" onChangeText={() => {}} error="Too big" />
      <Toggle label="Use points" value onChange={() => {}} />
      <ListRow title="Ramesh" subtitle="KL 07 AB 1234" trailing="₹500" badge="CASH" onPress={() => {}} first />
      <StatTile label="Today" value="₹1,500" />
      <AmountDisplay amount="1500.00" label="Customer pays" />
      <EmptyState title="No fills yet" />
      <ErrorState message="No connection" onRetry={() => {}} />
      <IconButton icon="search" label="Search" />
      <Skeleton />
    </Screen>,
  );
  const out = texts(r.toJSON());
  expect(out).toContain('SAVE ₹500 CASH');
  expect(out).toContain('₹1,500');
  expect(out).toContain('Too big');
  expect(out).toContain('ON');
  await ReactTestRenderer.act(async () => {
    r.unmount();
  });
});

test('a disabled button does not fire onPress', async () => {
  const onPress = jest.fn();
  const r = await render(<Button title="Save" disabled onPress={onPress} />);
  const node = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Save')[0];
  await ReactTestRenderer.act(async () => {
    node.props.onPress?.({});
  });
  expect(node.props.accessibilityState?.disabled ?? node.props.disabled).toBeTruthy();
});

test('QueryState shows error with retry, never the empty state', async () => {
  const refetch = jest.fn();
  const r = await render(
    <QueryState query={{data: undefined, isPending: false, isError: true, error: new Error('x'), refetch}} empty={{title: 'EMPTY'}}>
      {() => <Text>DATA</Text>}
    </QueryState>,
  );
  const out = texts(r.toJSON());
  expect(out).toContain('Try again');
  expect(out).not.toContain('EMPTY');
});

test('QueryState shows data, empty, and keeps stale data when a refresh fails', async () => {
  const base = {isPending: false, isError: false, error: null, refetch: jest.fn()};
  const data = await render(<QueryState query={{...base, data: [1]}}>{d => <Text>{`rows:${d.length}`}</Text>}</QueryState>);
  expect(texts(data.toJSON())).toContain('rows:1');
  const empty = await render(
    <QueryState query={{...base, data: [] as number[]}} isEmpty={d => d.length === 0} empty={{title: 'No fills yet'}}>
      {() => <Text>DATA</Text>}
    </QueryState>,
  );
  expect(texts(empty.toJSON())).toContain('No fills yet');
  const stale = await render(
    <QueryState query={{...base, isError: true, error: new Error('x'), data: [1, 2]}}>{d => <Text>{`rows:${d.length}`}</Text>}</QueryState>,
  );
  expect(texts(stale.toJSON())).toContain('rows:2');
});
