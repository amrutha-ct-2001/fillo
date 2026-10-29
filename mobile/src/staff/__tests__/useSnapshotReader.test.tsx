import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {useSnapshotReader} from '../useSnapshotReader';

function Harness(props: Parameters<typeof useSnapshotReader>[0]) {
  useSnapshotReader(props);
  return null;
}

const flush = async (ms = 0) => {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('reports a plate only after two matching reads', async () => {
  const onPlate = jest.fn();
  const reads = ['KL07A81234', 'KL07AB1234', 'KL07AB1234'];
  let t = 0;
  const props = {
    active: true,
    take: jest.fn(async () => 'file:///a.jpg'),
    read: jest.fn(async () => reads.shift() ?? null),
    onPlate,
    now: () => (t += 500),
  };
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(<Harness {...props} />);
  });
  for (let i = 0; i < 6; i++) {
    await flush(700);
  }
  expect(onPlate).toHaveBeenCalledTimes(1);
  expect(onPlate).toHaveBeenCalledWith('KL07AB1234', 'file:///a.jpg');
  // stops after a winner
  const takes = props.take.mock.calls.length;
  await flush(5000);
  expect(props.take.mock.calls.length).toBe(takes);
  r.unmount();
});

test('does nothing while inactive, and stops when switched off', async () => {
  const take = jest.fn(async () => 'file:///a.jpg');
  const base = {take, read: jest.fn(async () => null), onPlate: jest.fn()};
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(<Harness {...base} active={false} />);
  });
  await flush(3000);
  expect(take).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    r.update(<Harness {...base} active />);
  });
  await flush(2000);
  const seen = take.mock.calls.length;
  expect(seen).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => {
    r.update(<Harness {...base} active={false} />);
  });
  await flush(3000);
  expect(take.mock.calls.length).toBe(seen);
  r.unmount();
});

test('a failing snapshot is skipped and reading continues', async () => {
  const take = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('file:///a.jpg');
  const onPlate = jest.fn();
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(<Harness active take={take} read={async () => 'KL07AB1234'} onPlate={onPlate} />);
  });
  for (let i = 0; i < 6; i++) {
    await flush(700);
  }
  expect(onPlate).toHaveBeenCalledWith('KL07AB1234', 'file:///a.jpg');
  r.unmount();
});
