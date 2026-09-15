import { QueryClient } from '@tanstack/react-query';

// Create a client with expert defaults for an Admin Panel
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 5 minutes.
            // Navigation between pages within this time won't trigger a background refetch.
            staleTime: 5 * 60 * 1000,

            // Unused data remains in valid memory for 10 minutes before garbage collection.
            // This allows "going back" to contain instant data.
            gcTime: 10 * 60 * 1000,

            // If a query fails, retry once before showing error
            retry: 1,

            // Don't refetch just because the window gained focus (distracting in forms)
            refetchOnWindowFocus: false,
        },
    },
});
