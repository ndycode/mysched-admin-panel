import { useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'

import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'

import type { LoadResponse, UsersStats } from './types'

const PAGE_SIZE = 100
const QUERY_KEY = ['admin-users'] as const

export function useUsersDirectory() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const usersQuery = useInfiniteQuery({
    queryKey: QUERY_KEY,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_SIZE),
      })
      return await api<LoadResponse>(`/api/users?${params.toString()}`)
    },
    getNextPageParam: lastPage => {
      const page = lastPage.page ?? 1
      const limit = lastPage.limit ?? PAGE_SIZE
      const total = lastPage.count ?? lastPage.rows.length
      const fetched = page * limit
      if (fetched >= total) return undefined
      return page + 1
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api(`/api/users/${userId}`, { method: 'DELETE' })
    },
    onMutate: async userId => {
      setPendingDeleteId(userId)
    },
    onError: error => {
      const { message } = normalizeApiError(error, 'Failed to delete user')
      const msg = message ?? 'Failed to delete user'
      toast({ kind: 'error', msg })
    },
    onSuccess: async () => {
      toast({ kind: 'success', msg: 'User deleted' })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onSettled: () => {
      setPendingDeleteId(null)
    },
  })

  const pages = usersQuery.data?.pages ?? []
  const users = pages.flatMap(page => page.rows ?? [])
  const firstPage = pages[0] ?? null
  const latestPage = pages.length > 0 ? pages[pages.length - 1] : null
  const count = firstPage?.count ?? latestPage?.count ?? users.length

  const stats = useMemo<UsersStats>(() => {
    if (firstPage?.stats) {
      return firstPage.stats
    }
    if (latestPage?.stats) {
      return latestPage.stats
    }
    return {
      total: count,
      activeUsers: users.filter(row => row.status === 'active').length,
      instructorCount: users.filter(row => row.role === 'instructor').length,
      adminCount: users.filter(row => row.role === 'admin').length,
    }
  }, [firstPage, latestPage, count, users])

  const errorMessage = usersQuery.error
    ? ((usersQuery.error as { message?: string } | null)?.message ?? 'Failed to load users')
    : null

  return {
    users,
    count,
    stats,
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    error: errorMessage,
    refetch: usersQuery.refetch,
    hasNextPage: usersQuery.hasNextPage,
    loadMore: usersQuery.fetchNextPage,
    isLoadingMore: usersQuery.isFetchingNextPage,
    loadAll: async () => {
      let hasMore = usersQuery.hasNextPage
      while (hasMore) {
        const result = await usersQuery.fetchNextPage()
        hasMore = Boolean(result?.hasNextPage)
      }
      const data = queryClient.getQueryData<InfiniteData<LoadResponse>>(QUERY_KEY)
      const loadedPages = data?.pages ?? usersQuery.data?.pages ?? []
      return loadedPages.flatMap(page => page.rows ?? [])
    },
    deleteUser: deleteMutation.mutateAsync,
    deletingId: pendingDeleteId,
    isDeleting: deleteMutation.isPending,
  }
}

export type { UsersStats }
