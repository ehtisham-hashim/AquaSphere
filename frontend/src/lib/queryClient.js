import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Global TanStack Query Client configured with SWR and anti-tab-discard caching.
 * 
 * Key configuration:
 * - staleTime (5 mins): Data is considered fresh for 5 minutes, eliminating redundant API calls.
 * - gcTime (24 hours): Unused query data is retained in memory/storage for 24 hours.
 * - refetchOnWindowFocus (false): Tab switching does NOT trigger disruptive refetches or UI flashes.
 * - refetchOnReconnect (true): Re-validates when network connection is restored.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      refetchOnWindowFocus: false, // Prevents tab switch cache discard / reload flash
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

// Setup persistent client synchronization with sessionStorage if available
if (typeof window !== 'undefined' && window.sessionStorage) {
  try {
    const sessionStoragePersister = createAsyncStoragePersister({
      storage: window.sessionStorage,
      key: 'AQUASPHERE_QUERY_CACHE',
    });

    persistQueryClient({
      queryClient,
      persister: sessionStoragePersister,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  } catch (err) {
    console.warn('Failed to initialize QueryClient sessionStorage persistence:', err);
  }
}

/**
 * Invalidates all queries matching a key or invalidates all queries if no key provided.
 */
export function invalidateQueries(queryKey = null) {
  if (!queryKey) {
    return queryClient.invalidateQueries();
  }
  return queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
}
