export type SectionApiRow = {
  id?: number
  code?: string | null
  section_number?: string | null // legacy/nullable; currently using code as the primary value
  created_at?: string | null
  updated_at?: string | null
  class_count?: number | Array<{ count?: number | string | null }> | null
  classes?: Array<{ id?: number | null; archived_at?: string | null }> | null
}

export type SectionRow = {
  id: number | null
  key: string
  code: string | null
  sectionNumber: string
  createdAt: string | null
  updatedAt: string | null
  classCount: number | null
}

export type SectionStats = {
  totalSections: number
  addedThisMonth: number
  lastUpdated: string | null
}
