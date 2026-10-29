import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {authApi, pointsApi, transactionApi, unwrapList} from '../api/client';
import {useRefetchOnFocus} from './useRefetchOnFocus';

export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  customers: (q: string) => ['admin', 'customers', q] as const,
  customersAll: ['admin', 'customers'] as const,
  customer: (id: number) => ['admin', 'customer', id] as const,
  staff: ['admin', 'staff'] as const,
  settings: ['admin', 'settings'] as const,
};

export function useDashboard() {
  const query = useQuery({queryKey: adminKeys.dashboard, queryFn: async () => (await transactionApi.dashboard()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}

export const useCustomers = (q: string) =>
  useQuery({
    queryKey: adminKeys.customers(q),
    queryFn: async () => unwrapList((await authApi.listCustomers(q || undefined)).data),
  });

export const useCustomerDetail = (id: number) =>
  useQuery({queryKey: adminKeys.customer(id), queryFn: async () => (await transactionApi.customerDetail(id)).data});

export function useStaffList() {
  const query = useQuery({queryKey: adminKeys.staff, queryFn: async () => unwrapList((await authApi.listStaff()).data)});
  useRefetchOnFocus(query.refetch);
  return query;
}

export const useSettings = () =>
  useQuery({queryKey: adminKeys.settings, queryFn: async () => (await pointsApi.settings()).data});

export function useAdjustPoints(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {delta: number; note: string}) => (await pointsApi.adjust(customerId, v.delta, v.note)).data,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: adminKeys.customer(customerId)});
      qc.invalidateQueries({queryKey: adminKeys.customersAll});
      qc.invalidateQueries({queryKey: adminKeys.dashboard});
    },
  });
}

type StaffInput = {username: string; name: string; pin?: string; station_id?: number | null};

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: StaffInput & {pin: string}) => (await authApi.createStaff({...v, role: 'STAFF'})).data,
    onSuccess: () => qc.invalidateQueries({queryKey: adminKeys.staff}),
  });
}

export function useUpdateStaff(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: StaffInput) => (await authApi.updateStaff(id, v)).data,
    onSuccess: () => qc.invalidateQueries({queryKey: adminKeys.staff}),
  });
}

export function useSetStaffActive(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (active: boolean) => (active ? await authApi.activateStaff(id) : await authApi.deactivateStaff(id)).data,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: adminKeys.staff});
      qc.invalidateQueries({queryKey: adminKeys.dashboard});
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof pointsApi.updateSettings>[0]) => (await pointsApi.updateSettings(payload)).data,
    onSuccess: data => qc.setQueryData(adminKeys.settings, data),
  });
}
