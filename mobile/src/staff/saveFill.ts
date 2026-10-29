import NetInfo from '@react-native-community/netinfo';

import {transactionApi} from '../api/client';
import type {OfflineFill, Transaction} from '../api/types';
import {describeError, shouldQueueOffline} from '../utils/errors';
import {enqueueOfflineFill} from '../utils/offlineQueue';
import type {FillDraft} from './draft';
import {proofAllowed} from './fill';

export type SaveOutcome =
  | {kind: 'saved'; transaction: Transaction}
  /** Stored on the phone; points are added after sync. */
  | {kind: 'queued'}
  /** Turned down (or could not be stored). Everything staff typed is kept. */
  | {kind: 'rejected'; message: string};

export type SaveDeps = {
  isOnline: () => Promise<boolean>;
  create: (form: FormData) => Promise<{data: Transaction}>;
  enqueue: (item: OfflineFill) => Promise<void>;
  now: () => Date;
};

const defaultDeps: SaveDeps = {
  isOnline: async () => !!(await NetInfo.fetch()).isConnected,
  create: form => transactionApi.create(form),
  enqueue: enqueueOfflineFill,
  now: () => new Date(),
};

export function toOfflineFill(d: FillDraft, redeemPoints: number, now: Date): OfflineFill {
  return {
    id: d.id,
    createdAt: now.toISOString(),
    payload: {
      plate_number: d.plate,
      vehicle_id: d.vehicleId,
      phone: d.phone || undefined,
      name: d.name || undefined,
      amount: d.amount,
      payment_mode: d.mode,
      points_to_redeem: redeemPoints || undefined,
      vehicle_type: 'BIKE',
    },
    vehiclePhotoUri: d.vehiclePhotoUri,
    paymentProofUri: proofAllowed(d.mode) ? d.proofUri ?? undefined : undefined,
  };
}

export function toFormData(item: OfflineFill): FormData {
  const form = new FormData();
  const p = item.payload;
  form.append('client_id', item.id);
  form.append('plate_number', p.plate_number);
  form.append('amount', p.amount);
  form.append('payment_mode', p.payment_mode);
  if (p.vehicle_id) {
    form.append('vehicle_id', String(p.vehicle_id));
  }
  if (p.phone) {
    form.append('phone', p.phone);
  }
  if (p.name) {
    form.append('name', p.name);
  }
  if (p.points_to_redeem) {
    form.append('points_to_redeem', String(p.points_to_redeem));
  }
  if (item.vehiclePhotoUri) {
    form.append('vehicle_photo', {uri: item.vehiclePhotoUri, type: 'image/jpeg', name: 'vehicle.jpg'} as any);
  }
  if (item.paymentProofUri) {
    form.append('payment_proof', {uri: item.paymentProofUri, type: 'image/jpeg', name: 'payment.jpg'} as any);
  }
  return form;
}

/**
 * Save one fill. Queues it on the phone only when the request itself failed
 * (no signal, or a 5xx). A rejection (400 etc.) is shown to staff to fix.
 */
export async function saveFill(
  draft: FillDraft,
  redeemPoints: number,
  deps: SaveDeps = defaultDeps,
): Promise<SaveOutcome> {
  const item = toOfflineFill(draft, redeemPoints, deps.now());

  const queue = async (): Promise<SaveOutcome> => {
    try {
      await deps.enqueue(item);
      return {kind: 'queued'};
    } catch {
      return {kind: 'rejected', message: 'Could not save this fill on the phone. Free some space and try again.'};
    }
  };

  if (!(await deps.isOnline())) {
    return queue();
  }
  try {
    const {data} = await deps.create(toFormData(item));
    return {kind: 'saved', transaction: data};
  } catch (e) {
    if (shouldQueueOffline(e)) {
      return queue();
    }
    return {kind: 'rejected', message: describeError(e).message};
  }
}
