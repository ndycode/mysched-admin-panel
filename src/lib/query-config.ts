/**
 * Query configuration constants for React Query
 * Standardized stale times based on data type
 */

// Real-time data (dashboard stats) - always refetch
export const STALE_TIME_REALTIME = 0

// Table data - short cache for responsiveness with freshness
export const STALE_TIME_TABLE = 30_000 // 30 seconds

// Lookup/reference data - longer cache as it changes less frequently
export const STALE_TIME_LOOKUP = 60_000 // 1 minute

// Static reference data (semesters, departments) - longest cache
export const STALE_TIME_REFERENCE = 5 * 60 * 1000 // 5 minutes

// Default query options
export const DEFAULT_QUERY_OPTIONS = {
    refetchOnWindowFocus: false,
    retry: 1,
} as const
