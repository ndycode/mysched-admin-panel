/**
 * Shared constants used across the admin dashboard
 */

// Pagination options used in table views
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 10

// Common limits
export const DROPDOWN_SEARCH_LIMIT = 10
export const MAX_BULK_OPERATIONS = 100

// API fetch limits for different contexts
export const API_LIMITS = {
    /** For recent audit entries on dashboard */
    RECENT_AUDIT: 50,
    /** For full audit page */
    AUDIT_PAGE: 200,
    /** For fetching all items in dropdowns */
    DROPDOWN_ALL: 1000,
    /** For instructor options in forms */
    INSTRUCTOR_OPTIONS: 200,
} as const
