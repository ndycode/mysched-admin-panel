import { useState, useEffect } from 'react'

const PAGE_SIZE_KEY = 'mysched_admin_page_size'
const DEFAULT_PAGE_SIZE = 20

export function usePageSize() {
    const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem(PAGE_SIZE_KEY)
        if (saved) {
            const parsed = parseInt(saved, 10)
            if (!isNaN(parsed) && [20, 40, 50, 80].includes(parsed)) {
                setPageSizeState(parsed)
            }
        }
        setIsLoaded(true)
    }, [])

    const setPageSize = (size: number) => {
        setPageSizeState(size)
        localStorage.setItem(PAGE_SIZE_KEY, String(size))
    }

    return { pageSize, setPageSize, isLoaded }
}
