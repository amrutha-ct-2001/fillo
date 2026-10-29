import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockReplace = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({replace: mockReplace, navigate: mockNavigate, goBack: jest.fn()}),
}));
jest.mock('react-native-haptic-feedback', () => ({__esModule: true, default: {trigger: jest.fn()}}));
jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');
  return {SafeAreaView: View, useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})};
});

// The real camera is native; the screen only needs its props.
let mockCameraProps: any = {};
jest.mock('../../../camera/LiveCamera', () => ({
  LiveCamera: (p: any) => {
    mockCameraProps = p;
    return null;
  },
}));
let mockActive = true;
jest.mock('../../../staff/useScanActive', () => ({
  useScanActive: () => ({active: mockActive, idle: false, resume: jest.fn()}),
}));
let mockReaderOpts: any = {};
jest.mock('../../../staff/useSnapshotReader', () => ({useSnapshotReader: (o: any) => (mockReaderOpts = o)}));
let mockLookup: any = {status: 'idle', result: null, retry: jest.fn()};
jest.mock('../../../staff/usePlateLookup', () => ({usePlateLookup: () => mockLookup}));
jest.mock('../../../utils/camera', () => ({takePhoto: jest.fn()}));
jest.mock('../../../utils/ocr', () => ({
  normalizePlate: (p: string) => (p || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
  recognizePlateFromImage: jest.fn(),
}));

import {CAMERA_PROBLEM_DELAY_MS, ScanPlateScreen} from '../ScanPlateScreen';

const mount = async () => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    r = ReactTestRenderer.create(<ScanPlateScreen />);
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
const readerFinds = async (r: ReactTestRenderer.ReactTestRenderer, plate: string) => {
  await ReactTestRenderer.act(async () => {
    mockReaderOpts.onPlate(plate, 'file:///snap.jpg');
  });
};
const found = {
  status: 'found',
  plate: 'KL07AB1234',
  vehicle: {id: 7, customer: {id: 3, name: 'Ramesh', phone: '9876543210', points_balance: 40}},
};

beforeEach(() => {
  mockReplace.mockClear();
  mockNavigate.mockClear();
  mockActive = true;
  mockLookup = {status: 'idle', result: null, retry: jest.fn()};
});

test('starts scanning, with Type plate and Phone always available', async () => {
  const r = await mount();
  expect(text(r)).toContain('Hold the plate inside the frame');
  expect(mockReaderOpts.active).toBe(true);
  expect(mockCameraProps.active).toBe(true);
  await press(r, 'Type plate');
  expect(mockNavigate).toHaveBeenCalledWith('FindCustomer');
  await press(r, 'Phone');
  expect(mockNavigate).toHaveBeenCalledWith('FindCustomer', {mode: 'phone'});
});

test('a read plate for a known customer offers one big button and opens Fill', async () => {
  const r = await mount();
  mockLookup = {status: 'found', result: found, retry: jest.fn()};
  await readerFinds(r, 'KL07AB1234');
  expect(text(r)).toContain('USE KL 07 AB 1234 · Ramesh');
  // reading pauses while a plate waits for confirmation
  expect(mockReaderOpts.active).toBe(false);
  await press(r, 'USE KL 07 AB 1234 · Ramesh');
  expect(mockReplace).toHaveBeenCalledWith(
    'Fill',
    expect.objectContaining({plate: 'KL07AB1234', vehicleId: 7, customerId: 3, isNew: false, vehiclePhotoUri: 'file:///snap.jpg'}),
  );
});

test('an unregistered plate opens Fill as a new vehicle', async () => {
  const r = await mount();
  mockLookup = {status: 'new', result: {status: 'new', plate: 'KL07AB1234'}, retry: jest.fn()};
  await readerFinds(r, 'KL07AB1234');
  expect(text(r)).toContain('USE KL 07 AB 1234 · New vehicle');
  await press(r, 'USE KL 07 AB 1234 · New vehicle');
  expect(mockReplace).toHaveBeenCalledWith('Fill', expect.objectContaining({plate: 'KL07AB1234', isNew: true}));
});

test('a failed lookup shows Try again and cannot open Fill', async () => {
  const r = await mount();
  mockLookup = {status: 'error', result: {status: 'error', plate: 'KL07AB1234', error: {kind: 'network', message: 'No connection'}}, retry: jest.fn()};
  await readerFinds(r, 'KL07AB1234');
  expect(text(r)).toContain('No connection');
  expect(text(r)).toContain('Try again');
  expect(text(r)).not.toContain('USE KL');
});

test('Scan again clears the plate and resumes reading', async () => {
  const r = await mount();
  mockLookup = {status: 'found', result: found, retry: jest.fn()};
  await readerFinds(r, 'KL07AB1234');
  await press(r, 'Scan again');
  expect(mockReaderOpts.active).toBe(true);
  expect(text(r)).toContain('Hold the plate inside the frame');
});

test('a camera error that lasts offers the phone camera instead', async () => {
  jest.useFakeTimers();
  try {
    const r = await mount();
    await ReactTestRenderer.act(async () => {
      mockCameraProps.onError('Camera in use by another app');
    });
    // reading stops at once, but the message waits a moment in case the camera recovers
    expect(mockReaderOpts.active).toBe(false);
    expect(text(r)).not.toContain('Use phone camera');
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(CAMERA_PROBLEM_DELAY_MS);
    });
    expect(text(r)).toContain('Camera in use by another app');
    expect(text(r)).toContain('Use phone camera');
  } finally {
    jest.useRealTimers();
  }
});

test('a passing start-up error never flashes the camera problem', async () => {
  jest.useFakeTimers();
  try {
    const r = await mount();
    await ReactTestRenderer.act(async () => {
      mockCameraProps.onError('Camera is starting');
    });
    await ReactTestRenderer.act(async () => {
      mockCameraProps.onStarted();
      jest.advanceTimersByTime(CAMERA_PROBLEM_DELAY_MS);
    });
    expect(text(r)).not.toContain('Use phone camera');
    expect(text(r)).toContain('Hold the plate inside the frame');
  } finally {
    jest.useRealTimers();
  }
});

test('the reader is off when the screen is inactive, and it says the camera is starting', async () => {
  mockActive = false;
  const r = await mount();
  expect(mockReaderOpts.active).toBe(false);
  expect(text(r)).toContain('Starting camera…');
  expect(text(r)).not.toContain('Camera is off');
});
