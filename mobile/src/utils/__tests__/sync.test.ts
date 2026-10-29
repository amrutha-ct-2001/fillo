const mockStore: Record<string, string> = {};
jest.mock('../storage', () => ({
  storage: {
    getJSON: async (k: string) => (mockStore[k] ? JSON.parse(mockStore[k]) : undefined),
    setJSON: async (k: string, v: unknown) => {
      // yield so un-serialized read-modify-write cycles would interleave
      await Promise.resolve();
      mockStore[k] = JSON.stringify(v);
    },
  },
}));
const mockFiles = new Set<string>();
jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/docs',
  mkdir: async () => undefined,
  copyFile: async (_from: string, to: string) => {
    mockFiles.add(to);
  },
  exists: async (p: string) => mockFiles.has(p),
  unlink: async (p: string) => {
    mockFiles.delete(p);
  },
}));
const mockCreate = jest.fn();
jest.mock('../../api/client', () => ({transactionApi: {create: (f: any) => mockCreate(f)}}));

import type {OfflineFill} from '../../api/types';
import {
  discardFailedFills,
  enqueueOfflineFill,
  getFailedFills,
  getOfflineQueue,
  removeOfflineFill,
  setQueueOwner,
} from '../offlineQueue';
import {syncOfflineQueue} from '../sync';

const fill = (id: string): OfflineFill => ({
  id,
  createdAt: new Date().toISOString(),
  payload: {plate_number: 'KL07AB1234', amount: '100', payment_mode: 'CASH'},
});

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  mockCreate.mockReset();
  mockFiles.clear();
  setQueueOwner(1);
});

test('concurrent enqueue and remove do not lose a fill', async () => {
  await enqueueOfflineFill(fill('aaaaaaaa-1'));
  await Promise.all([removeOfflineFill('aaaaaaaa-1'), enqueueOfflineFill(fill('bbbbbbbb-2'))]);
  expect((await getOfflineQueue()).map(f => f.id)).toEqual(['bbbbbbbb-2']);
});

test('overlapping syncs post each fill once, oldest first', async () => {
  await enqueueOfflineFill(fill('aaaaaaaa-1'));
  await enqueueOfflineFill(fill('bbbbbbbb-2'));
  const posted: string[] = [];
  mockCreate.mockImplementation(async (form: any) => {
    posted.push(form.get('client_id'));
    await new Promise<void>(r => setTimeout(r, 5));
    return {data: {}};
  });
  const results = await Promise.all([syncOfflineQueue(), syncOfflineQueue(), syncOfflineQueue()]);
  expect(posted).toEqual(['aaaaaaaa-1', 'bbbbbbbb-2']);
  expect(results).toEqual([2, 2, 2]);
  expect(await getOfflineQueue()).toEqual([]);
});

test('a 4xx moves the fill to the failed list instead of deleting it', async () => {
  await enqueueOfflineFill(fill('aaaaaaaa-1'));
  await enqueueOfflineFill(fill('bbbbbbbb-2'));
  mockCreate
    .mockRejectedValueOnce({response: {status: 400, data: {detail: 'Insufficient points'}}})
    .mockResolvedValueOnce({data: {}});
  expect(await syncOfflineQueue()).toBe(1);
  const failed = await getFailedFills();
  expect(failed).toHaveLength(1);
  expect(failed[0].reason).toBe('Insufficient points');
  expect(failed[0].item.id).toBe('aaaaaaaa-1');
});

test('network failure keeps everything queued', async () => {
  await enqueueOfflineFill(fill('aaaaaaaa-1'));
  mockCreate.mockRejectedValue(new Error('Network Error'));
  expect(await syncOfflineQueue()).toBe(0);
  expect(await getOfflineQueue()).toHaveLength(1);
  expect(await getFailedFills()).toHaveLength(0);
});

test('a fill is only visible to and synced by the staff member who made it', async () => {
  await enqueueOfflineFill(fill('aaaaaaaa-1')); // queued while staff 1 is signed in
  setQueueOwner(null); // logout
  expect(await getOfflineQueue()).toEqual([]);
  expect(await syncOfflineQueue()).toBe(0);

  setQueueOwner(2); // a different staff member signs in on the same device
  expect(await getOfflineQueue()).toEqual([]);
  expect(await syncOfflineQueue()).toBe(0);
  expect(mockCreate).not.toHaveBeenCalled();

  setQueueOwner(1); // the owner returns: the fill is still there
  expect((await getOfflineQueue()).map(f => f.id)).toEqual(['aaaaaaaa-1']);
});

test('discarding rejected fills leaves another staff member\'s alone', async () => {
  mockCreate.mockRejectedValue({response: {status: 400, data: {detail: 'bad'}}});
  await enqueueOfflineFill(fill('aaaaaaaa-1'));
  await syncOfflineQueue(); // rejected -> failed list, owner 1
  setQueueOwner(2);
  await discardFailedFills();
  setQueueOwner(1);
  expect((await getFailedFills()).length).toBe(1);
  await discardFailedFills();
  expect(await getFailedFills()).toEqual([]);
});

test('queued photos are copied to persistent storage and removed after sync', async () => {
  await enqueueOfflineFill({
    ...fill('aaaaaaaa-1'),
    vehiclePhotoUri: 'file:///cache/plate.jpg',
  });
  const [queued] = await getOfflineQueue();
  expect(queued.vehiclePhotoUri).toBe('file:///docs/offline-fills/aaaaaaaa-1-vehicle.jpg');
  expect(mockFiles.has('/docs/offline-fills/aaaaaaaa-1-vehicle.jpg')).toBe(true);

  mockCreate.mockResolvedValue({data: {}});
  await syncOfflineQueue();
  expect(mockFiles.size).toBe(0);
});

test('a fill whose photo vanished still uploads, without the photo', async () => {
  await enqueueOfflineFill({
    ...fill('aaaaaaaa-1'),
    vehiclePhotoUri: 'file:///cache/plate.jpg',
  });
  mockFiles.clear(); // OS cleared it
  const sent: any[] = [];
  mockCreate.mockImplementation(async (form: any) => {
    sent.push(form.get('vehicle_photo'));
    return {data: {}};
  });
  expect(await syncOfflineQueue()).toBe(1);
  expect(sent).toEqual([null]);
});
