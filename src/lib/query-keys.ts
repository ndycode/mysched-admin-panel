/**
 * Centralized query keys for React Query
 * Prevents typos and ensures cache invalidation works correctly
 */

export const QUERY_KEYS = {
    // Classes
    CLASSES: ['classes'] as const,
    CLASSES_TABLE: ['classes', 'table'] as const,
    CLASSES_DETAIL: (id: number | string) => ['classes', 'detail', id] as const,

    // Sections
    SECTIONS: ['sections'] as const,
    SECTIONS_TABLE: ['sections', 'table'] as const,
    SECTIONS_OPTIONS: ['sections', 'options'] as const,

    // Semesters
    SEMESTERS: ['semesters'] as const,
    SEMESTERS_OPTIONS: ['semesters', 'options'] as const,

    // Instructors
    INSTRUCTORS: ['instructors'] as const,
    INSTRUCTORS_TABLE: ['instructors', 'table'] as const,
    INSTRUCTORS_OPTIONS: ['instructors', 'options'] as const,

    // Users
    USERS: ['users'] as const,
    USERS_TABLE: ['users', 'table'] as const,

    // Dashboard
    DASHBOARD_STATS: ['dashboard', 'stats'] as const,

    // Audit
    AUDIT: ['audit'] as const,
    AUDIT_RECENT: ['audit', 'recent'] as const,

    // Notifications
    NOTIFICATIONS: ['notifications'] as const,

    // Issues
    ISSUE_REPORTS: ['issue-reports'] as const,
} as const
