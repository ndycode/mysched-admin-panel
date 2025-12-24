import { describe, it, expect } from 'vitest'
import { API_ROUTES, apiRoute } from '../api-routes'

describe('api-routes', () => {
    describe('API_ROUTES', () => {
        it('should have classes route', () => {
            expect(API_ROUTES.CLASSES).toBe('/api/classes')
        })

        it('should have sections route', () => {
            expect(API_ROUTES.SECTIONS).toBe('/api/sections')
        })

        it('should have users route', () => {
            expect(API_ROUTES.USERS).toBe('/api/users')
        })

        it('should have instructors route', () => {
            expect(API_ROUTES.INSTRUCTORS).toBe('/api/instructors')
        })

        it('should have semesters route', () => {
            expect(API_ROUTES.SEMESTERS).toBe('/api/semesters')
        })

        it('should have audit route', () => {
            expect(API_ROUTES.AUDIT).toBe('/api/audit')
        })

        it('should have notifications route', () => {
            expect(API_ROUTES.NOTIFICATIONS).toBe('/api/notifications')
        })

        it('should have issue reports route', () => {
            expect(API_ROUTES.ISSUE_REPORTS).toBe('/api/issue-reports')
        })

        it('should have logout route', () => {
            expect(API_ROUTES.LOGOUT).toBe('/api/logout')
        })

        it('should have specialized import routes', () => {
            expect(API_ROUTES.CLASSES_IMPORT_IMAGE).toBe('/api/classes/import-image')
            expect(API_ROUTES.CLASSES_IMPORT_CONFIRM).toBe('/api/classes/import-confirm')
        })

        it('all routes should start with /api/', () => {
            Object.values(API_ROUTES).forEach(route => {
                expect(route).toMatch(/^\/api\//)
            })
        })
    })

    describe('apiRoute helpers', () => {
        it('should build class route with ID', () => {
            expect(apiRoute.class(123)).toBe('/api/classes/123')
        })

        it('should build section route with ID', () => {
            expect(apiRoute.section(456)).toBe('/api/sections/456')
        })

        it('should build user route with string ID', () => {
            expect(apiRoute.user('abc-123')).toBe('/api/users/abc-123')
        })

        it('should build instructor route with ID', () => {
            expect(apiRoute.instructor(789)).toBe('/api/instructors/789')
        })

        it('should build semester route with ID', () => {
            expect(apiRoute.semester(1)).toBe('/api/semesters/1')
        })
    })
})
