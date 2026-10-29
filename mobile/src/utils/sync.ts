import * as RNFS from '@dr.pogodin/react-native-fs';

import {transactionApi} from '../api/client';
import type {OfflineFill} from '../api/types';
import {getOfflineQueue, moveToFailed, removeOfflineFill} from './offlineQueue';

// Single-flight: focus, NetInfo and the banner can all ask for a sync at once.
// They share one run, otherwise each reads the same snapshot and posts twice.
let inflight: Promise<number> | null = null;

export function syncOfflineQueue(): Promise<number> {
  if (!inflight) {
    inflight = runSync().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

function errorReason(e: any): string {
  const data = e?.response?.data;
  if (data?.detail) return String(data.detail);
  if (data && typeof data === 'object') return JSON.stringify(data);
  return e?.message || 'Rejected by server';
}

async function runSync(): Promise<number> {
  const queue = await getOfflineQueue();
  let synced = 0;
  for (const item of queue) {
    try {
      await postFill(item);
      await removeOfflineFill(item.id);
      synced += 1;
    } catch (e: any) {
      const status = e?.response?.status;
      // The server will never accept this one. Keep it in the failed list so
      // staff can review or retry it, instead of silently losing the sale.
      if (status && status >= 400 && status < 500 && status !== 401) {
        await moveToFailed(item.id, {status, reason: errorReason(e)});
        continue;
      }
      // Network / 5xx / 401 — keep the rest and retry later (preserve order).
      // Safe to retry: the fill's client_id makes the server ignore duplicates.
      break;
    }
  }
  return synced;
}

// A photo that no longer exists would make the upload fail without a server
// response and block the whole queue, so send the fill without it.
async function stillThere(uri?: string): Promise<boolean> {
  if (!uri) return false;
  try {
    return await RNFS.exists(decodeURI(uri.replace(/^file:\/\//, '')));
  } catch {
    return true;
  }
}

export async function postFill(item: OfflineFill) {
  const form = new FormData();
  form.append('client_id', item.id);
  // Record when the fill happened, not when it finally synced.
  form.append('created_at', item.createdAt);
  form.append('plate_number', item.payload.plate_number);
  form.append('amount', item.payload.amount);
  form.append('payment_mode', item.payload.payment_mode);
  if (item.payload.vehicle_id) form.append('vehicle_id', String(item.payload.vehicle_id));
  if (item.payload.phone) form.append('phone', item.payload.phone);
  if (item.payload.name) form.append('name', item.payload.name);
  if (item.payload.vehicle_type) form.append('vehicle_type', item.payload.vehicle_type);
  if (item.payload.notes) form.append('notes', item.payload.notes);
  if (item.payload.points_to_redeem) {
    form.append('points_to_redeem', String(item.payload.points_to_redeem));
  }
  if (await stillThere(item.vehiclePhotoUri)) {
    form.append('vehicle_photo', {
      uri: item.vehiclePhotoUri,
      type: 'image/jpeg',
      name: 'vehicle.jpg',
    } as any);
  }
  if (await stillThere(item.paymentProofUri)) {
    form.append('payment_proof', {
      uri: item.paymentProofUri,
      type: 'image/jpeg',
      name: 'payment.jpg',
    } as any);
  }
  return transactionApi.create(form);
}
