import type {User, Vehicle} from '../api/types';
import {authApi, vehicleApi} from '../api/client';
import {AppError, describeError, isNotFound} from '../utils/errors';
import {tenDigits} from '../utils/format';
import {normalizePlate} from '../utils/ocr';

/**
 * Looking a customer up has three honest outcomes. A failed request is never
 * reported as "new": that would let staff create a duplicate customer just
 * because the signal dropped.
 */
export type PlateLookup =
  | {status: 'invalid'}
  | {status: 'found'; plate: string; vehicle: Vehicle}
  | {status: 'new'; plate: string}
  | {status: 'error'; plate: string; error: AppError};

export type PhoneLookup =
  | {status: 'invalid'}
  | {status: 'found'; phone: string; customer: User; vehicles: Vehicle[]}
  | {status: 'new'; phone: string}
  | {status: 'error'; phone: string; error: AppError};

export const MIN_PLATE_LENGTH = 4;

type PlateFetcher = (plate: string) => Promise<{data: Vehicle}>;
type PhoneFetcher = (phone: string) => Promise<{data: User & {vehicles: Vehicle[]}}>;

export async function lookupPlate(
  raw: string,
  fetcher: PlateFetcher = vehicleApi.lookup,
): Promise<PlateLookup> {
  const plate = normalizePlate(raw);
  if (plate.length < MIN_PLATE_LENGTH) {
    return {status: 'invalid'};
  }
  try {
    const {data} = await fetcher(plate);
    return {status: 'found', plate, vehicle: data};
  } catch (e) {
    return isNotFound(e) ? {status: 'new', plate} : {status: 'error', plate, error: describeError(e)};
  }
}

export async function lookupPhone(
  raw: string,
  fetcher: PhoneFetcher = authApi.lookupCustomer,
): Promise<PhoneLookup> {
  const phone = tenDigits(raw);
  if (phone.length !== 10) {
    return {status: 'invalid'};
  }
  try {
    const {data} = await fetcher(phone);
    const {vehicles, ...customer} = data;
    return {status: 'found', phone, customer, vehicles: vehicles ?? []};
  } catch (e) {
    return isNotFound(e) ? {status: 'new', phone} : {status: 'error', phone, error: describeError(e)};
  }
}
