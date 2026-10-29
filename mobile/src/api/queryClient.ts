import {QueryClient} from '@tanstack/react-query';

/**
 * One shared client. Cleared on logout so the next person to sign in on this
 * phone never sees the previous person's cached points or fills.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
