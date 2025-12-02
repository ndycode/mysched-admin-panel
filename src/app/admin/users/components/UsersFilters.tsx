import { Filter, Search } from 'lucide-react'

import { Input, Select } from '@/components/ui'

import type { SortOption, UserRole, UserStatus } from '../types'

const STATUS_FILTERS: Array<{ value: UserStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

const ROLE_FILTERS: Array<{ value: UserRole | 'all'; label: string }> = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'student', label: 'Student' },
]

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
]

type UsersFiltersProps = {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: UserStatus | 'all'
  onStatusChange: (value: UserStatus | 'all') => void
  roleFilter: UserRole | 'all'
  onRoleChange: (value: UserRole | 'all') => void
  sort: SortOption
  onSortChange: (value: SortOption) => void
}

export function UsersFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  sort,
  onSortChange,
}: UsersFiltersProps) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="relative flex-1 md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Search users by name, email, or student ID"
          aria-label="Search users"
          className="pl-9 border-input bg-background text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:items-center lg:gap-4 md:flex-none">
        <div className="relative w-full min-w-[10rem] lg:w-40">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Select
            value={statusFilter}
            onChange={event => onStatusChange(event.target.value as UsersFiltersProps['statusFilter'])}
            aria-label="Filter by status"
            className="pl-9 pr-8 border-input bg-background text-foreground"
          >
            {STATUS_FILTERS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="relative w-full min-w-[10rem] lg:w-40">
          <Select
            value={roleFilter}
            onChange={event => onRoleChange(event.target.value as UsersFiltersProps['roleFilter'])}
            aria-label="Filter by role"
            className="pr-8 border-input bg-background text-foreground"
          >
            {ROLE_FILTERS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="relative w-full min-w-[10rem] lg:w-48">
          <Select
            value={sort}
            onChange={event => onSortChange(event.target.value as SortOption)}
            aria-label="Sort users"
            className="pr-8 border-input bg-background text-foreground"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </section>
  )
}

export { STATUS_FILTERS, ROLE_FILTERS, SORT_OPTIONS }
