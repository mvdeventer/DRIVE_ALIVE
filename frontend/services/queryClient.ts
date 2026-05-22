/**
 * Shared React Query client used across the whole app.
 *
 * Mounted once in App.tsx via <QueryClientProvider>.
 * Import from screens/hooks for cache access:
 *
 *   import { queryClient } from '../services/queryClient';
 *   queryClient.invalidateQueries({ queryKey: ['bookings'] });
 */
import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: Platform.OS === 'web',
    },
    mutations: {
      retry: 0,
    },
  },
});

// Refetch when the RN app returns to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}
