import { QueryClient } from "@tanstack/react-query";

/*
  This file should ONLY configure React Query.
  It must NOT build API URLs.
  It must NOT add "/api".
  Networking is handled inside lib/api.ts and lib/orders.ts.
*/

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // refresh orders every 5 seconds (live kitchen updates)
      refetchInterval: 5000,

      // prevent extra reload spam
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,

      // don't retry failed requests forever
      retry: false,

      // always fetch fresh orders
      staleTime: 0,
    },

    mutations: {
      retry: false,
    },
  },
});