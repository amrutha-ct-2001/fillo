import {useQuery} from '@tanstack/react-query';

import {pointsApi, transactionApi, vehicleApi} from '../api/client';
import {useRefetchOnFocus} from './useRefetchOnFocus';

export const customerKeys = {
  points: ['customer', 'points'] as const,
  fills: ['customer', 'fills'] as const,
  vehicles: ['customer', 'vehicles'] as const,
};

export function useMyPoints() {
  const query = useQuery({queryKey: customerKeys.points, queryFn: async () => (await pointsApi.me()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}

export function useMyFills() {
  const query = useQuery({queryKey: customerKeys.fills, queryFn: async () => (await transactionApi.mine()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}

export function useMyVehicles() {
  const query = useQuery({queryKey: customerKeys.vehicles, queryFn: async () => (await vehicleApi.mine()).data});
  useRefetchOnFocus(query.refetch);
  return query;
}
