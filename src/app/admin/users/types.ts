export type UserRole = 'admin' | 'instructor' | 'student'

export type UserStatus = 'active' | 'inactive' | 'suspended'

export type SortOption =
    | 'recent'
    | 'oldest'
    | 'name-asc'
    | 'name-desc'
    | 'student-asc'
    | 'student-desc'
    | 'email-asc'
    | 'email-desc'
    | 'role-asc'
    | 'role-desc'
    | 'app-asc'
    | 'app-desc'
    | 'status-asc'
    | 'status-desc'

export type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  student_id: string | null
  app_user_id: number | null
  created_at: string | null
  last_sign_in_at: string | null
  providers: string[]
  avatar_url: string | null
  role: UserRole
  status: UserStatus
}

export type UsersStats = {
  total: number
  activeUsers: number
  instructorCount: number
  adminCount: number
}

export type LoadResponse = {
  rows: UserRow[]
  count: number
  page: number
  limit: number
  stats: UsersStats
}
