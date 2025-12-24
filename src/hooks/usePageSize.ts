'use client'

import { useState, useEffect, useCallback } from 'react'

const PAGE_SIZE_KEY = 'mysched_admin_page_size'
const DEFAULT_PAGE_SIZE = 20
const VALID_SIZES = [20, 40, 50, 80] as const

export function usePageSize() {
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_KEY)
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && VALID_SIZES.includes(parsed as typeof VALID_SIZES[number])) {
          setPageSizeState(parsed)
        }
      }
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.)
    }
    setIsLoaded(true)
  }, [])

  const setPageSize = useCallback((size: number) => {
    if (!VALID_SIZES.includes(size as typeof VALID_SIZES[number])) {
      return
    }
    setPageSizeState(size)
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(size))
    } catch {
      // localStorage unavailable
    }
  }, [])

  return { pageSize, setPageSize, isLoaded }
}
