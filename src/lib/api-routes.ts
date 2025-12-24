/**
 * Centralized API route definitions
 * Ensures consistency and makes refactoring easier
 */

export const API_ROUTES = {
    // Core entities
    CLASSES: '/api/classes',
    SECTIONS: '/api/sections',
    SEMESTERS: '/api/semesters',
    INSTRUCTORS: '/api/instructors',
    USERS: '/api/users',

    // Audit & reporting
    AUDIT: '/api/audit',
    NOTIFICATIONS: '/api/notifications',
    ISSUE_REPORTS: '/api/issue-reports',

    // Auth
    LOGOUT: '/api/logout',

    // Specialized endpoints
    CLASSES_IMPORT_IMAGE: '/api/classes/import-image',
    CLASSES_IMPORT_CONFIRM: '/api/classes/import-confirm',
    INSTRUCTORS_UPLOAD: '/api/instructors/upload',
    INSTRUCTORS_BULK: '/api/instructors/bulk',
    INSTRUCTORS_AUTO_ASSIGN: '/api/instructors/auto-assign-departments',
} as const

// Helper to build entity-specific routes
export const apiRoute = {
    class: (id: number | string) => `${API_ROUTES.CLASSES}/${id}`,
    section: (id: number | string) => `${API_ROUTES.SECTIONS}/${id}`,
    semester: (id: number | string) => `${API_ROUTES.SEMESTERS}/${id}`,
    instructor: (id: number | string) => `${API_ROUTES.INSTRUCTORS}/${id}`,
    user: (id: number | string) => `${API_ROUTES.USERS}/${id}`,
} as const
