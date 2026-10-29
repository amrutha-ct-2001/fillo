import * as RNFS from '@dr.pogodin/react-native-fs';

import type {OfflineFill} from '../api/types';
import {storage} from './storage';

const KEY = 'offlineQueue';
const FAILED_KEY = 'offlineFailed';

export type FailedFill = {
  item: OfflineFill;
  status?: number;
  reason: string;
  failedAt: string;
};

// Camera photos live in the OS cache and can be cleared before a fill syncs,
// so queued fills keep their own copy in the app's document directory.
const PHOTO_DIR = `${RNFS.DocumentDirectoryPath}/offline-fills`;
const toPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, ''));

async function persistPhoto(
  id: string,
  kind: string,
  uri?: string,
): Promise<string | undefined> {
  if (!uri || uri.includes(PHOTO_DIR)) return uri;
  try {
    await RNFS.mkdir(PHOTO_DIR);
    const dest = `${PHOTO_DIR}/${id}-${kind}.jpg`;
    await RNFS.copyFile(toPath(uri), dest);
    return `file://${dest}`;
  } catch {
    return uri; // keep the original rather than lose the fill
  }
}

async function deletePhotos(item: OfflineFill) {
  for (const uri of [item.vehiclePhotoUri, item.paymentProofUri]) {
    if (!uri || !uri.includes(PHOTO_DIR)) continue;
    await RNFS.unlink(toPath(uri)).catch(() => undefined);
  }
}

// Whose fills the app may see and sync. Set by the auth store on login/logout,
// so one staff member never uploads (or discards) another's queued sales.
let owner: number | null = null;
export function setQueueOwner(id: number | null) {
  owner = id;
}
// Fills queued before staffId existed have no owner; whoever is logged in adopts them.
const mine = (item: OfflineFill) =>
  owner !== null && (item.staffId === undefined || item.staffId === owner);

// AsyncStorage read-modify-write is not atomic, so every queue mutation runs
// through this chain; otherwise a remove can overwrite a concurrent enqueue.
let chain: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export function newFillId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<OfflineFill[]> {
  return (await storage.getJSON<OfflineFill[]>(KEY)) ?? [];
}

async function readAllFailed(): Promise<FailedFill[]> {
  return (await storage.getJSON<FailedFill[]>(FAILED_KEY)) ?? [];
}

/** The signed-in staff member's queued fills. */
export async function getOfflineQueue(): Promise<OfflineFill[]> {
  return (await readAll()).filter(mine);
}

export async function enqueueOfflineFill(fill: OfflineFill): Promise<void> {
  const vehiclePhotoUri = await persistPhoto(fill.id, 'vehicle', fill.vehiclePhotoUri);
  const paymentProofUri = await persistPhoto(fill.id, 'payment', fill.paymentProofUri);
  return serialized(async () => {
    const q = await readAll();
    if (q.some(f => f.id === fill.id)) return;
    q.push({
      ...fill,
      vehiclePhotoUri,
      paymentProofUri,
      staffId: fill.staffId ?? owner ?? undefined,
    }); // oldest first, so fills sync in the order they happened
    await storage.setJSON(KEY, q);
  });
}

export function removeOfflineFill(id: string): Promise<void> {
  return serialized(async () => {
    const q = await readAll();
    const gone = q.find(f => f.id === id);
    await storage.setJSON(
      KEY,
      q.filter(f => f.id !== id),
    );
    if (gone) await deletePhotos(gone);
  });
}

export async function getFailedFills(): Promise<FailedFill[]> {
  return (await readAllFailed()).filter(f => mine(f.item));
}

/** Move a fill the server rejected out of the queue, but keep it for review. */
export function moveToFailed(
  id: string,
  info: {status?: number; reason: string},
): Promise<void> {
  return serialized(async () => {
    const q = await readAll();
    const item = q.find(f => f.id === id);
    if (!item) return;
    const failed = await readAllFailed();
    failed.push({...info, item, failedAt: new Date().toISOString()});
    await storage.setJSON(FAILED_KEY, failed);
    await storage.setJSON(
      KEY,
      q.filter(f => f.id !== id),
    );
  });
}

/** Put a failed fill back in the queue to retry. */
export function retryFailedFill(id: string): Promise<void> {
  return serialized(async () => {
    const failed = await readAllFailed();
    const hit = failed.find(f => f.item.id === id && mine(f.item));
    if (!hit) return;
    const q = await readAll();
    q.push(hit.item);
    await storage.setJSON(KEY, q);
    await storage.setJSON(
      FAILED_KEY,
      failed.filter(f => f.item.id !== id),
    );
  });
}

/** Only discards the signed-in staff member's rejected fills — never the live queue. */
export function discardFailedFills(): Promise<void> {
  return serialized(async () => {
    const failed = await readAllFailed();
    await storage.setJSON(
      FAILED_KEY,
      failed.filter(f => !mine(f.item)),
    );
    for (const f of failed.filter(x => mine(x.item))) await deletePhotos(f.item);
  });
}
