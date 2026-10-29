import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

import {rewardApi, stationApi} from '../api/client';
import type {Reward, Station, VoucherStatus} from '../api/types';
import {customerKeys} from './customer';
import {useRefetchOnFocus} from './useRefetchOnFocus';

export const rewardKeys = {
  rewards: ['rewards', 'list'] as const,
  myVouchers: ['rewards', 'mine'] as const,
  vouchers: (status: VoucherStatus | 'ALL') => ['rewards', 'vouchers', status] as const,
  vouchersAll: ['rewards', 'vouchers'] as const,
  stations: ['stations'] as const,
};

/** Customers and staff get the active catalog; admin gets every reward. */
export function useRewards() {
  const query = useQuery({queryKey: rewardKeys.rewards, queryFn: async () => (await rewardApi.list()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}

export function useMyVouchers() {
  const query = useQuery({queryKey: rewardKeys.myVouchers, queryFn: async () => (await rewardApi.myVouchers()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: number) => (await rewardApi.redeem(rewardId)).data,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: rewardKeys.myVouchers});
      qc.invalidateQueries({queryKey: rewardKeys.rewards});
      qc.invalidateQueries({queryKey: customerKeys.points});
    },
  });
}

export function useAllVouchers(status: VoucherStatus | 'ALL') {
  const query = useQuery({
    queryKey: rewardKeys.vouchers(status),
    queryFn: async () => (await rewardApi.allVouchers(status === 'ALL' ? undefined : status)).data,
  });
  useRefetchOnFocus(query.refetch);
  return query;
}

export function useCancelVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await rewardApi.cancelVoucher(id)).data,
    onSuccess: () => {
      qc.invalidateQueries({queryKey: rewardKeys.vouchersAll});
      qc.invalidateQueries({queryKey: rewardKeys.rewards});
    },
  });
}

export function useSaveReward(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Reward, 'id' | 'created_at'>) =>
      (id === undefined ? await rewardApi.create(data) : await rewardApi.update(id, data)).data,
    onSuccess: () => qc.invalidateQueries({queryKey: rewardKeys.rewards}),
  });
}

export function useStations() {
  const query = useQuery({queryKey: rewardKeys.stations, queryFn: async () => (await stationApi.list()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}

export function useSaveStation(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Station, 'id' | 'staff_count' | 'created_at'>) =>
      (id === undefined ? await stationApi.create(data) : await stationApi.update(id, data)).data,
    onSuccess: () => qc.invalidateQueries({queryKey: rewardKeys.stations}),
  });
}
