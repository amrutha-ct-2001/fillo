import type {PlateLookup} from './lookup';
import {DEFAULT_PAYMENT_MODE, PaymentMode, proofAllowed} from './fill';
import {normalizePlate} from '../utils/ocr';

/**
 * Everything staff have entered for one fill. `id` doubles as the server's
 * `client_id`, so an online attempt and any offline retry of the same fill
 * are recognised as one and never double-count.
 */
export type FillDraft = {
  id: string;
  plate: string;
  vehicleId?: number;
  customerId?: number;
  name: string;
  phone: string;
  /** True when name/phone were filled from a lookup (so a plate edit must clear them). */
  contactFromLookup: boolean;
  pointsBalance: number;
  isNewVehicle: boolean;
  amount: string;
  mode: PaymentMode;
  redeem: boolean;
  proofUri: string | null;
  vehiclePhotoUri?: string;
};

export type DraftSeed = {
  plate: string;
  vehicleId?: number;
  customerId?: number;
  name?: string;
  phone?: string;
  pointsBalance?: number;
  isNew?: boolean;
  vehiclePhotoUri?: string;
};

export function createDraft(seed: DraftSeed, id: string): FillDraft {
  const known = seed.vehicleId !== undefined;
  return {
    id,
    plate: normalizePlate(seed.plate),
    vehicleId: seed.vehicleId,
    customerId: seed.customerId,
    name: seed.name ?? '',
    phone: seed.phone ?? '',
    contactFromLookup: known,
    pointsBalance: seed.pointsBalance ?? 0,
    isNewVehicle: seed.isNew ?? !known,
    amount: '',
    mode: DEFAULT_PAYMENT_MODE,
    redeem: false,
    proofUri: null,
    vehiclePhotoUri: seed.vehiclePhotoUri,
  };
}

export type DraftAction =
  | {type: 'editPlate'; plate: string}
  | {type: 'lookup'; result: PlateLookup}
  | {type: 'amount'; amount: string}
  | {type: 'mode'; mode: PaymentMode}
  | {type: 'proof'; uri: string | null}
  | {type: 'name'; name: string}
  | {type: 'phone'; phone: string}
  | {type: 'redeem'; on: boolean}
  | {type: 'vehiclePhoto'; uri: string | undefined}
  /** The server turned this attempt down; a corrected retry must be a new fill. */
  | {type: 'rejected'; newId: string};

export function draftReducer(s: FillDraft, a: DraftAction): FillDraft {
  switch (a.type) {
    case 'editPlate': {
      const plate = normalizePlate(a.plate);
      if (plate === s.plate) {
        return s;
      }
      // A different plate means a different customer: drop anything the
      // old lookup filled in, so it can never be saved against the wrong person.
      return {
        ...s,
        plate,
        vehicleId: undefined,
        customerId: undefined,
        pointsBalance: 0,
        redeem: false,
        isNewVehicle: true,
        ...(s.contactFromLookup ? {name: '', phone: '', contactFromLookup: false} : null),
      };
    }
    case 'lookup': {
      const r = a.result;
      if (r.status === 'found') {
        const c = r.vehicle.customer;
        return {
          ...s,
          vehicleId: r.vehicle.id,
          customerId: c.id,
          name: c.name || '',
          phone: c.phone || '',
          contactFromLookup: true,
          pointsBalance: c.points_balance ?? 0,
          isNewVehicle: false,
        };
      }
      if (r.status === 'new') {
        return {...s, vehicleId: undefined, customerId: undefined, pointsBalance: 0, redeem: false, isNewVehicle: true};
      }
      return s;
    }
    case 'amount':
      return {...s, amount: a.amount.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')};
    case 'mode':
      // Cash has no proof photo; drop one taken for a different mode.
      return {...s, mode: a.mode, proofUri: proofAllowed(a.mode) ? s.proofUri : null};
    case 'proof':
      return {...s, proofUri: proofAllowed(s.mode) ? a.uri : null};
    case 'name':
      return {...s, name: a.name, contactFromLookup: false};
    case 'phone':
      return {...s, phone: a.phone.replace(/\D/g, '').slice(0, 10), contactFromLookup: false};
    case 'redeem':
      return {...s, redeem: a.on};
    case 'vehiclePhoto':
      return {...s, vehiclePhotoUri: a.uri};
    case 'rejected':
      return {...s, id: a.newId};
    default:
      return s;
  }
}
