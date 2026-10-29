import axios, {AxiosInstance} from 'axios';
import {TurboModuleRegistry, type TurboModule} from 'react-native';

import type {
  Dashboard,
  LedgerEntry,
  PointsSettings,
  Redemption,
  Reward,
  Station,
  Transaction,
  User,
  Vehicle,
  VoucherStatus,
} from './types';
import {storage} from '../utils/storage';

interface SourceCodeSpec extends TurboModule {
  getConstants(): {scriptURL: string};
}

/**
 * Debug builds talk to Django on the machine that serves the JS bundle:
 *   Metro over USB (localhost): 127.0.0.1 + `adb reverse tcp:8001 tcp:8001`
 *   Metro over Wi‑Fi (dev menu → bundle location = <PC LAN IP>:8081): that
 *     same LAN IP, no cable needed. Run Django as `python manage.py runserver`.
 * Fillo uses port 8001 (not Django's usual 8000) so it never collides with
 * another local Django project and reads the wrong database.
 *   Android emulator: Metro is reached at 10.0.2.2, so the API is too.
 * Release builds use the hosted HTTPS server (staging for now; switch to the
 * production domain when it exists). Android and iOS both block plain HTTP there.
 */
function devServerHost(): string {
  try {
    const scriptURL = TurboModuleRegistry.get<SourceCodeSpec>('SourceCode')?.getConstants().scriptURL ?? '';
    const host = scriptURL.match(/^https?:\/\/([^/:]+)/)?.[1];
    if (host && host !== 'localhost') return host;
  } catch {
    // no native SourceCode (tests): fall back to USB
  }
  return '127.0.0.1';
}

const RELEASE_API_URL = 'https://api.fillo.example.com';

export const API_BASE_URL = __DEV__ ? `http://${devServerHost()}:8001` : RELEASE_API_URL;

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use(async config => {
  if (!authToken) {
    authToken = (await storage.getString('accessToken')) ?? null;
  }
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  error => {
    if (error?.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  requestOtp: (phone: string) =>
    api.post<{
      detail: string;
      phone: string;
      is_new?: boolean;
      otp_hint?: string;
    }>('/auth/otp/request/', {phone}),
  verifyOtp: (phone: string, otp: string, name?: string) =>
    api.post<{access: string; refresh: string; user: User}>(
      '/auth/otp/verify/',
      {phone, otp, name},
    ),
  pinLogin: (username: string, pin: string) =>
    api.post<{access: string; refresh: string; user: User}>('/auth/pin/login/', {
      username,
      pin,
    }),
  me: () => api.get<User>('/auth/me/'),
  updateMe: (name: string) => api.patch<User>('/auth/me/', {name}),
  listCustomers: (q?: string) =>
    api.get<{results?: User[]} | User[]>('/auth/customers/', {params: {q}}),
  listStaff: () =>
    api.get<{results?: User[]} | User[]>('/auth/staff/'),
  createStaff: (data: {
    username: string;
    pin: string;
    name?: string;
    role?: string;
    phone?: string;
    station_id?: number | null;
  }) => api.post<User>('/auth/staff/', data),
  updateStaff: (
    id: number,
    data: {
      username?: string;
      name?: string;
      pin?: string;
      is_active?: boolean;
      station_id?: number | null;
    },
  ) => api.patch<User>(`/auth/staff/${id}/`, data),
  deactivateStaff: (id: number) =>
    api.post<User>(`/auth/staff/${id}/deactivate/`),
  activateStaff: (id: number) =>
    api.post<User>(`/auth/staff/${id}/activate/`),
  lookupCustomer: (phone: string) =>
    api.get<User & {vehicles: Vehicle[]}>('/auth/customers/lookup/', {
      params: {phone},
    }),
};

export const vehicleApi = {
  lookup: (plate: string) =>
    api.get<Vehicle>('/vehicles/lookup/', {params: {plate}}),
  create: (form: FormData) =>
    api.post<Vehicle>('/vehicles/', form, {
      headers: {'Content-Type': 'multipart/form-data'},
    }),
  mine: () => api.get<Vehicle[]>('/vehicles/mine/'),
};

export const transactionApi = {
  create: (form: FormData) =>
    api.post<Transaction>('/transactions/', form, {
      headers: {'Content-Type': 'multipart/form-data'},
    }),
  mine: () => api.get<Transaction[]>('/transactions/mine/'),
  recent: () => api.get<Transaction[]>('/transactions/recent/'),
  dashboard: () => api.get<Dashboard>('/transactions/admin/dashboard/'),
  customerDetail: (id: number) =>
    api.get<{
      customer: User;
      balance: number;
      vehicles: Vehicle[];
      transactions: Transaction[];
      ledger: LedgerEntry[];
    }>(`/transactions/admin/customers/${id}/`),
};

export const pointsApi = {
  me: () =>
    api.get<{
      balance: number;
      settings: PointsSettings;
      ledger: LedgerEntry[];
    }>('/points/me/'),
  settings: () => api.get<PointsSettings>('/points/settings/'),
  updateSettings: (data: Partial<PointsSettings>) =>
    api.patch<PointsSettings>('/points/settings/', data),
  adjust: (customer_id: number, delta: number, note?: string) =>
    api.post<{entry: LedgerEntry; balance: number}>('/points/adjust/', {
      customer_id,
      delta,
      note,
    }),
};

export const stationApi = {
  list: () => api.get<Station[]>('/stations/'),
  create: (data: Omit<Station, 'id' | 'staff_count' | 'created_at'>) => api.post<Station>('/stations/', data),
  update: (id: number, data: Partial<Omit<Station, 'id'>>) => api.patch<Station>(`/stations/${id}/`, data),
};

export const rewardApi = {
  list: () => api.get<Reward[]>('/rewards/'),
  create: (data: Omit<Reward, 'id' | 'created_at'>) => api.post<Reward>('/rewards/', data),
  update: (id: number, data: Partial<Omit<Reward, 'id'>>) => api.patch<Reward>(`/rewards/${id}/`, data),
  redeem: (id: number) => api.post<Redemption>(`/rewards/${id}/redeem/`),
  myVouchers: () => api.get<Redemption[]>('/rewards/redemptions/mine/'),
  allVouchers: (status?: VoucherStatus) =>
    api.get<Redemption[]>('/rewards/redemptions/', {params: status ? {status} : undefined}),
  cancelVoucher: (id: number) => api.post<Redemption>(`/rewards/redemptions/${id}/cancel/`),
  checkVoucher: (code: string) => api.get<Redemption>(`/rewards/vouchers/${encodeURIComponent(code)}/`),
  useVoucher: (code: string) => api.post<Redemption>(`/rewards/vouchers/${encodeURIComponent(code)}/use/`),
};

export function unwrapList<T>(data: {results?: T[]} | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}
