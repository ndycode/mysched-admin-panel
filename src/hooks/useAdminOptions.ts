'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { parseSectionCoursePrefix } from '@/lib/form-utils'
import type { Semester, Section, InstructorSummary, GroupedSections } from '@/types/admin'

// ============ Semesters Hook ============

export function useSemesters(options?: { enabled?: boolean }) {
    const query = useQuery({
        queryKey: ['semesters', 'options'],
        queryFn: async () => api<Semester[]>('/api/semesters'),
        enabled: options?.enabled ?? true,
        staleTime: 5 * 60 * 1000,
    })

    const semesters = useMemo(() => query.data ?? [], [query.data])
    const activeSemester = useMemo(() => semesters.find(s => s.is_active), [semesters])

    return {
        semesters,
        activeSemester,
        isLoading: query.isFetching,
        error: query.error,
    }
}

// ============ Sections Hook ============

export function useSections(options?: { enabled?: boolean; semesterId?: number | string }) {
    const query = useQuery({
        queryKey: ['sections', 'options'],
        queryFn: async () => api<Section[]>('/api/sections'),
        enabled: options?.enabled ?? true,
        staleTime: 5 * 60 * 1000,
    })

    const allSections = useMemo(() => query.data ?? [], [query.data])

    // Filter by semester if specified
    const sections = useMemo(() => {
        if (!options?.semesterId) return allSections
        const semId = typeof options.semesterId === 'string'
            ? Number(options.semesterId)
            : options.semesterId
        return allSections.filter(s => s.semester_id === semId)
    }, [allSections, options?.semesterId])

    // Group sections by course prefix for cascading dropdowns
    const groupedSections: GroupedSections[] = useMemo(() => {
        const groups = new Map<string, Section[]>()
        for (const section of sections) {
            const course = parseSectionCoursePrefix(section.code)
            if (!groups.has(course)) groups.set(course, [])
            groups.get(course)!.push(section)
        }
        return Array.from(groups.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([course, secs]) => ({
                course,
                sections: secs.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''))
            }))
    }, [sections])

    return {
        sections,
        allSections,
        groupedSections,
        isLoading: query.isFetching,
        error: query.error,
    }
}

// ============ Instructors Hook ============

export function useInstructors(options?: { enabled?: boolean; limit?: number }) {
    const limit = options?.limit ?? 200

    const query = useQuery({
        queryKey: ['instructors', 'options', limit],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.set('limit', String(limit))
            params.set('sort', 'name')
            const response = await api<{ rows: InstructorSummary[] }>(
                `/api/instructors?${params.toString()}`
            )
            return response.rows ?? []
        },
        enabled: options?.enabled ?? true,
        staleTime: 5 * 60 * 1000,
    })

    return {
        instructors: query.data ?? [],
        isLoading: query.isFetching,
        error: query.error,
    }
}
