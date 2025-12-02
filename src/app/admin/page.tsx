'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  RefreshCw,
  Search,
  Link as LinkIcon,
  ArrowRight,
  MoreHorizontal,
  Copy,
  Eye,
  Layers,
  Grid,
  AlertCircle,
  Users,
  User,
  GraduationCap,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Activity,
  BookOpen,
  CalendarPlus,
  UserPlus,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { StatsCard, CardSurface, CARD_BASE, StatusPill } from './_components/design-system'
import { motion, AnimatePresence } from 'framer-motion'
import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { SmoothAreaChart } from './_components/SmoothAreaChart'
import { SmoothDonutChart } from './_components/SmoothDonutChart'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/SmoothDropdown'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedTabs } from './_components/AnimatedTabs'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { AddClassDialog } from './_components/dialogs/AddClassDialog'
import { AddSectionDialog } from './_components/dialogs/AddSectionDialog'
import { ImportClassesDialog } from './_components/dialogs/ImportClassesDialog'
import { AddUserDialog } from './users/components/dialogs/AddUserDialog'
import { useToast } from '@/components/toast'
import { inputClasses } from '@/components/ui/Input'

/* ---------------------------------------------------------- */
/* Types                                                      */
/* ---------------------------------------------------------- */

type AuditAction = 'created' | 'updated' | 'deleted' | 'archived' | 'restored'

type AuditDiff =
  | { action: 'created'; data: Record<string, unknown> }
  | { action: 'updated'; before: Record<string, unknown>; after: Record<string, unknown> }
  | { action: 'deleted'; data: Record<string, unknown> }
  | { action: 'archived'; data: Record<string, unknown> }
  | { action: 'restored'; data: Record<string, unknown> }

type AuditEntry = {
  id: number
  entity: string
  entity_id: number
  action: AuditAction
  table_name: string
  diff: AuditDiff
  details: Record<string, unknown>
  user_id: string
  user_name: string
  user_avatar: string
  created_at: string
  at?: string // fallback
}

function formatTimeAgo(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}


type Section = {
  id: number
  code: string
}

type InstructorSummary = {
  id: string
  full_name: string
  email: string | null
  title: string | null
  department: string | null
  avatar_url: string | null
}

type ClassesResponse = {
  rows: unknown[]
  count: number
}

const parseAuditTimestamp = (entry: AuditEntry): number | null => {
  const raw = entry.at || entry.created_at
  if (!raw) return null
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const startOfHour = (date: Date) => {
  const next = new Date(date)
  next.setMinutes(0, 0, 0)
  return next
}

const startOfDay = (date: Date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const buildActivitySeries = (range: string, events: AuditEntry[]) => {
  const now = new Date()
  const timestamps = events
    .map(parseAuditTimestamp)
    .filter((ts): ts is number => ts !== null)

  type Bucket = {
    start: number
    end: number
    label: string
    value: number
    events: { id: number; action: string; user: string; time: string }[]
  }
  const buckets: Bucket[] = []

  const addBucket = (start: Date, end: Date, label: string) =>
    buckets.push({ start: start.getTime(), end: end.getTime(), label, value: 0, events: [] })

  if (range === '1hr') {
    // 5-minute buckets for last hour (12 buckets)
    const endOfCurrentBucket = new Date(now)
    endOfCurrentBucket.setSeconds(0, 0)
    endOfCurrentBucket.setMinutes(Math.ceil(endOfCurrentBucket.getMinutes() / 5) * 5)

    for (let i = 11; i >= 0; i--) {
      const end = new Date(endOfCurrentBucket.getTime() - i * 5 * 60 * 1000)
      const start = new Date(end.getTime() - 5 * 60 * 1000)
      addBucket(start, end, start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }
  } else if (range === '4hr') {
    // 15-minute buckets for last 4 hours (16 buckets)
    const endOfCurrentBucket = new Date(now)
    endOfCurrentBucket.setSeconds(0, 0)
    endOfCurrentBucket.setMinutes(Math.ceil(endOfCurrentBucket.getMinutes() / 15) * 15)

    for (let i = 15; i >= 0; i--) {
      const end = new Date(endOfCurrentBucket.getTime() - i * 15 * 60 * 1000)
      const start = new Date(end.getTime() - 15 * 60 * 1000)
      addBucket(start, end, start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }
  } else if (range === '12hr') {
    // 30-minute buckets for last 12 hours (24 buckets)
    const endOfCurrentBucket = new Date(now)
    endOfCurrentBucket.setSeconds(0, 0)
    endOfCurrentBucket.setMinutes(Math.ceil(endOfCurrentBucket.getMinutes() / 30) * 30)

    for (let i = 23; i >= 0; i--) {
      const end = new Date(endOfCurrentBucket.getTime() - i * 30 * 60 * 1000)
      const start = new Date(end.getTime() - 30 * 60 * 1000)
      addBucket(start, end, start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }
  } else if (range === '1d') {
    // 1-hour buckets for last 24 hours
    const currentHour = startOfHour(now)
    for (let i = 23; i >= 0; i -= 1) {
      const start = new Date(currentHour)
      start.setHours(currentHour.getHours() - i)
      const end = new Date(start)
      end.setDate(start.getDate() + 1) // Fix: end date should be +1 hour not +1 day for 1d view? No, loop is per hour.
      // Actually the logic above was: end.setHours(start.getHours() + 1)
      // Let's stick to the original logic which was correct for 1d
      const endBucket = new Date(start)
      endBucket.setHours(start.getHours() + 1)
      addBucket(start, endBucket, start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    }
  } else if (range === '3d') {
    // 3-hour buckets for last 3 days (24 buckets)
    const currentHour = startOfHour(now)
    // Align to 3-hour block
    currentHour.setHours(Math.floor(currentHour.getHours() / 3) * 3)

    for (let i = 23; i >= 0; i--) {
      const start = new Date(currentHour)
      start.setHours(currentHour.getHours() - i * 3)
      const end = new Date(start)
      end.setHours(start.getHours() + 3)
      addBucket(start, end, start.toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))
    }
  } else if (range === '7d') {
    // 1-day buckets for last 7 days
    const today = startOfDay(now)
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(today)
      start.setDate(today.getDate() - i)
      const end = new Date(start)
      end.setDate(start.getDate() + 1)
      addBucket(start, end, start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))
    }
  }

  if (buckets.length === 0) return []

  // Populate events
  for (const entry of events) {
    const ts = parseAuditTimestamp(entry)
    if (!ts) continue
    if (ts < buckets[0].start || ts >= buckets[buckets.length - 1].end) continue

    const bucket = buckets.find(({ start, end }) => ts >= start && ts < end)
    if (bucket) {
      bucket.value += 1
      bucket.events.push({
        id: entry.id,
        action: entry.action,
        user: entry.user_name || 'System',
        time: new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      })
    }
  }

  return buckets.map(({ label, value, events }) => ({
    date: label,
    value,
    events: events.sort((a, b) => b.id - a.id).slice(0, 5) // Show top 5 newest events
  }))
}

function QuickActionBtn({ icon, label, onClick, variant = 'secondary', className }: { icon: any; label: string; onClick: () => void; variant?: 'primary' | 'secondary'; className?: string }) {
  return (
    <AnimatedActionBtn
      icon={icon}
      label={label}
      onClick={onClick}
      variant={variant}
      className={cn("w-full justify-start px-4", className)}
    />
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"
      />
    </svg>
  )
}

const floatLabelVariants = {
  idle: { y: 14, scale: 1, opacity: 0.7 },
  floating: { y: 4, scale: 0.78, opacity: 1 },
}

export default function AdminDashboard() {
  const toast = useToast()
  const router = useRouter()

  // 1. Fetch Classes Count
  const { data: classesData, refetch: refetchClasses, isFetching: loadingClasses } = useQuery({
    queryKey: ['classes', 'count'],
    queryFn: async () => api<ClassesResponse>('/api/classes?limit=1'),
    refetchOnMount: true,
    staleTime: 0,
  })

  // 2. Fetch Sections
  const { data: sectionsData, refetch: refetchSections, isFetching: loadingSections } = useQuery({
    queryKey: ['sections', 'all'],
    queryFn: async () => api<Section[]>('/api/sections'),
    refetchOnMount: true,
    staleTime: 0,
  })

  // 3. Fetch Audit Log (Recent Activity)
  const { data: auditData, refetch: refetchAudit, isFetching: loadingAudit } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: async () => api<AuditEntry[]>('/api/audit?limit=50&sort=recent'),
    refetchOnMount: true,
    staleTime: 0,
  })

  // 4. Fetch Incidents (Errors)
  const { data: incidentsData, refetch: refetchIncidents, isFetching: loadingIncidents } = useQuery({
    queryKey: ['audit', 'errors'],
    queryFn: async () => api<AuditEntry[]>('/api/audit?action=error&limit=1'),
    refetchOnMount: true,
    staleTime: 0,
  })

  // 5. Fetch Instructors (for Import Dialog)
  const { data: instructorsData, refetch: refetchInstructors, isFetching: loadingInstructors } = useQuery({
    queryKey: ['instructors', 'options'],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '200')
      params.set('sort', 'name')
      const response = await api<{ rows: InstructorSummary[] }>(
        `/api/instructors?${params.toString()}`,
      )
      return response.rows ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const loading = loadingClasses || loadingSections || loadingAudit || loadingIncidents || loadingInstructors
  const initialLoading =
    loading ||
    classesData === undefined ||
    sectionsData === undefined ||
    auditData === undefined ||
    incidentsData === undefined

  const load = () => {
    refetchClasses()
    refetchSections()
    refetchAudit()
    refetchIncidents()
    refetchInstructors()
    setStatsPulse(p => p + 1)
  }

  // Derived Data
  const classesCount = classesData?.count ?? 0
  const sectionsCount = sectionsData?.length ?? 0
  const instructors = instructorsData ?? []
  const auditEntriesRaw = useMemo(() => auditData ?? [], [auditData])
  const incidentsCount = incidentsData?.length ?? 0

  const totalActivity = classesCount + sectionsCount + auditEntriesRaw.length

  const [activeTab, setActiveTab] = useState('1d')
  const [activeDistTab, setActiveDistTab] = useState('Overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [activityPage, setActivityPage] = useState(1)
  const activityPageSize = 6
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)
  const [addClassOpen, setAddClassOpen] = useState(false)
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [statsPulse, setStatsPulse] = useState(0)

  const toneDotClasses: Record<'success' | 'info' | 'danger' | 'warning', string> = {
    success: 'bg-emerald-500',
    info: 'bg-sky-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
  }

  const tonePillClasses: Record<'success' | 'info' | 'danger' | 'warning', string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  }

  const actionToneClasses: Record<'success' | 'info' | 'danger' | 'warning', string> = {
    success: 'border-emerald-100 text-emerald-700 bg-emerald-50',
    info: 'border-sky-100 text-sky-700 bg-sky-50',
    danger: 'border-rose-100 text-rose-700 bg-rose-50',
    warning: 'border-amber-100 text-amber-800 bg-amber-50',
  }

  const filteredAuditEntries = useMemo(() => {
    if (!searchTerm) return auditEntriesRaw
    const lower = searchTerm.toLowerCase()
    return auditEntriesRaw
      .filter(entry =>
        (entry.entity || '').toLowerCase().includes(lower) ||
        (entry.table_name || '').toLowerCase().includes(lower) ||
        (entry.user_name || '').toLowerCase().includes(lower) ||
        (entry.action || '').toLowerCase().includes(lower),
      )
  }, [auditEntriesRaw, searchTerm])

  const activityPageCount = Math.max(1, Math.ceil(filteredAuditEntries.length / activityPageSize))

  useEffect(() => {
    setActivityPage(1)
  }, [searchTerm])

  useEffect(() => {
    setActivityPage(prev => Math.min(prev, activityPageCount))
  }, [activityPageCount])

  const auditEntries = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize
    return filteredAuditEntries.slice(start, start + activityPageSize)
  }, [activityPage, activityPageSize, filteredAuditEntries])

  const chartData = useMemo(
    () => buildActivitySeries(activeTab, auditEntriesRaw),
    [activeTab, auditEntriesRaw],
  )

  const analytics = useMemo(() => {
    const base = [
      { name: 'Total classes', value: classesCount, color: 'color-mix(in srgb, var(--primary), transparent 0%)' },
      { name: 'Total sections', value: sectionsCount, color: 'color-mix(in srgb, var(--primary), transparent 30%)' },
      { name: 'Recent actions', value: auditEntriesRaw.length, color: 'color-mix(in srgb, var(--primary), transparent 60%)' },
      {
        name: 'Incidents',
        value: incidentsCount,
        color: incidentsCount > 0 ? 'var(--destructive)' : 'color-mix(in srgb, var(--primary), transparent 80%)',
      },
    ]

    if (incidentsCount === 0) {
      base[3].color = 'color-mix(in srgb, var(--primary), transparent 80%)'
    }

    if (activeDistTab === 'Overview') return base

    // For specific tabs, highlight the matching item and dim others
    const matcher = activeDistTab.toLowerCase()
    return base.map(item => {
      const lowerName = item.name.toLowerCase()
      const isMatch = matcher === 'classes' ? lowerName.includes('classes') : matcher === 'sections' ? lowerName.includes('sections') : false
      return {
        ...item,
        color: isMatch
          ? 'color-mix(in srgb, var(--primary), transparent 0%)'
          : 'color-mix(in srgb, var(--muted-foreground), transparent 0%)',
        // zero-out non-match to remove their contribution
        value: isMatch ? item.value : 0,
      }
    })
  }, [activeDistTab, auditEntriesRaw.length, classesCount, sectionsCount, incidentsCount])


  const headerActions = (
    <div className="hidden items-center gap-3 sm:flex">
      <AnimatedActionBtn
        icon={RefreshCw}
        label="Reload"
        onClick={load}
        isLoading={initialLoading}
        loadingLabel="Refreshing..."
        variant="secondary"
        spinner="framer"
      />
    </div>
  )


  const handleCopyId = (id: number) => {
    navigator.clipboard.writeText(id.toString())
    toast({ kind: 'success', msg: 'ID copied to clipboard' })
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          </div>
          {headerActions}
        </div>

        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
            <StatsCard
              icon={TrendingUp}
              label="Total Activity"
              value={totalActivity.toLocaleString()}
              trend={{ value: "+12.5%", label: "vs last week", direction: "up" }}
              description="System wide actions"
              className="shadow-sm border-border"
              href="/admin/audit"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Layers}
              label="Classes"
              value={classesCount.toLocaleString()}
              trend={{ value: "100%", label: "active", direction: "neutral" }}
              className="shadow-sm border-border"
              href="/admin/classes"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Grid}
              label="Sections"
              value={sectionsCount.toLocaleString()}
              trend={{ value: "All", label: "scheduled", direction: "neutral" }}
              className="shadow-sm border-border"
              href="/admin/sections"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={AlertCircle}
              label="Incidents"
              value={incidentsCount.toLocaleString()}
              trend={incidentsCount > 0
                ? { value: `${incidentsCount} New`, label: "require attention", direction: "down" }
                : { value: "All clear", label: "system healthy", direction: "up" }
              }
              className="shadow-sm border-border"
              href="/admin/audit?action=error"
              animateKey={statsPulse}
            />
          </div>

          {/* Main Content Area - Grid Layout */}
          <div className="grid gap-6 lg:grid-cols-3 items-stretch">
            {/* Left Column (Main Content) */}
            <div className="lg:col-span-2 flex flex-col gap-6 h-full">
              {/* Activity Chart */}
              <CardSurface className="p-6 shadow-sm border-border">
                <div className="mb-6 flex flex-col gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-foreground">Activity Overview</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total Events:</span>
                        <motion.span
                          key={`events-${statsPulse}-${activeTab}`}
                          className="font-medium text-foreground inline-block min-w-8"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          {chartData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                        </motion.span>
                      </div>
                      <div className="h-4 w-px bg-border" />
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Peak:</span>
                        <motion.span
                          key={`peak-${statsPulse}-${activeTab}`}
                          className="font-medium text-foreground inline-block min-w-6"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
                        >
                          {Math.max(...chartData.map(d => d.value), 0).toLocaleString()}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                  <AnimatedTabs
                    tabs={[
                      { value: '1hr', label: '1h' },
                      { value: '4hr', label: '4h' },
                      { value: '12hr', label: '12h' },
                      { value: '1d', label: '1d' },
                      { value: '3d', label: '3d' },
                      { value: '7d', label: '1w' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    layoutId="time-range-tabs"
                    className="w-fit"
                  />
                </div>
                <div className="h-64 w-full">
                  <SmoothAreaChart data={chartData} height={250} />
                </div>
              </CardSurface>

              {/* Recent Updates */}
              <CardSurface className="flex flex-col shadow-sm border-border space-y-4 min-h-[48rem]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Recent Updates</h2>
                    <p className="text-sm text-muted-foreground">Latest system activities.</p>
                  </div>
                  <AnimatedActionBtn
                    icon={ArrowRight}
                    label="View All"
                    onClick={() => router.push('/admin/audit')}
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                  />
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={inputClasses({ className: 'pl-9 pr-4', size: 'md' })}
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-1">
                    {auditEntries.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <p>No recent activity found.</p>
                      </div>
                    ) : (
                      auditEntries.map((entry) => {
                        const lower = entry.action?.toLowerCase() ?? ''
                        const tone: 'success' | 'info' | 'danger' | 'warning' =
                          lower === 'insert'
                            ? 'success'
                            : lower === 'delete' || lower === 'error'
                              ? 'danger'
                              : lower === 'update'
                                ? 'info'
                                : 'info'
                        const actionLabel = lower ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : entry.action
                        return (
                          <div
                            key={entry.id}
                            className="group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all hover:bg-muted/50 border border-transparent hover:border-border/50"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <AvatarThumbnail
                              name={entry.user_name}
                              src={entry.user_avatar}
                              size="sm"
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                    {entry.user_name || 'System'}
                                  </span>
                                  <StatusPill tone={tone}>
                                    <span className="capitalize tracking-tight">{actionLabel}</span>
                                  </StatusPill>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                  {formatTimeAgo(entry.at || entry.created_at || '')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/80 font-mono bg-muted/50 px-1 rounded">
                                  {entry.table_name}
                                </span>
                                <span>•</span>
                                <span className="truncate">
                                  {entry.details
                                    ? Object.keys(entry.details).join(', ')
                                    : 'View details'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 mt-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Page {activityPage} of {activityPageCount}
                      </span>

                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                        disabled={activityPage === 1 || filteredAuditEntries.length === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setActivityPage(p => Math.min(activityPageCount, p + 1))}
                        disabled={activityPage * activityPageSize >= filteredAuditEntries.length}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardSurface>
            </div>

            {/* Right Column (Sidebar) */}
            <div className="flex flex-col gap-6 h-full">
              {/* Distribution Chart */}
              <CardSurface className="p-6 shadow-sm border-border">
                <div className="mb-6 flex flex-col gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Distribution</h2>
                    <p className="text-sm text-muted-foreground">Data breakdown.</p>
                  </div>
                  <AnimatedTabs
                    tabs={[
                      { value: 'Overview', label: 'Overview' },
                      { value: 'Classes', label: 'Classes' },
                      { value: 'Sections', label: 'Sections' },
                    ]}
                    activeTab={activeDistTab}
                    onTabChange={setActiveDistTab}
                    layoutId="distribution-tabs"
                    className="w-fit"
                  />
                </div>

                <div className="flex flex-col items-center justify-center gap-6">
                  {/* Chart */}
                  <div className="h-52 w-52 relative shrink-0">
                    <SmoothDonutChart data={analytics} height={200} animateKey={`${statsPulse}-${activeDistTab}`} />
                  </div>

                  {/* Legend */}
                  <div className="space-y-4 w-full">
                    {analytics.map((item, i) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between group cursor-default"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full shadow-sm ring-2 ring-transparent group-hover:ring-offset-1 group-hover:ring-current transition-all"
                            style={{ backgroundColor: item.color, color: item.color }}
                          />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {item.name}
                          </span>
                        </div>
                        <motion.span
                          key={`${item.name}-${activeDistTab}-${statsPulse}-${item.value}`}
                          className="font-bold text-foreground font-mono inline-block min-w-6 text-right"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          {item.value.toLocaleString()}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardSurface>

              {/* Quick Actions */}
              <CardSurface className="p-6 shadow-sm border-border h-fit">
                <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  <QuickActionBtn
                    icon={Upload}
                    label="Import Image"
                    onClick={() => setImportOpen(true)}
                  />
                  <QuickActionBtn
                    icon={BookOpen}
                    label="Add Class"
                    onClick={() => setAddClassOpen(true)}
                  />
                  <QuickActionBtn
                    icon={CalendarPlus}
                    label="Add Section"
                    onClick={() => setAddSectionOpen(true)}
                  />
                  <QuickActionBtn
                    icon={UserPlus}
                    label="Add User"
                    onClick={() => setAddUserOpen(true)}
                  />
                </div>
              </CardSurface>
              <CardSurface className="p-6 shadow-sm border-border flex flex-col min-h-[26rem] grow">
                <div className="flex grow flex-col justify-between gap-5">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-foreground">System Health</h2>
                    <p className="text-sm text-muted-foreground">Operational status.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full text-emerald-700 dark:text-emerald-400 bg-current animate-pulse" />
                        <span className="text-sm font-medium text-foreground">Database</span>
                      </div>
                      <StatusPill tone="success">Operational</StatusPill>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full text-emerald-700 dark:text-emerald-400 bg-current animate-pulse" />
                        <span className="text-sm font-medium text-foreground">API Gateway</span>
                      </div>
                      <StatusPill tone="success">Operational</StatusPill>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full text-emerald-700 dark:text-emerald-400 bg-current animate-pulse" />
                        <span className="text-sm font-medium text-foreground">Auth Service</span>
                      </div>
                      <StatusPill tone="success">Operational</StatusPill>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Avg latency</p>
                      <motion.p
                        key={`latency-${statsPulse}`}
                        className="text-sm font-semibold text-foreground"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        124 ms
                      </motion.p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Error rate</p>
                      <motion.p
                        key={`error-${statsPulse}`}
                        className="text-sm font-semibold text-foreground"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
                      >
                        0.02%
                      </motion.p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Open incidents</p>
                      <motion.p
                        key={`open-${statsPulse}-${incidentsCount}`}
                        className="text-sm font-semibold text-foreground"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
                      >
                        {incidentsCount}
                      </motion.p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Last check</p>
                      <motion.p
                        key={`last-${statsPulse}`}
                        className="text-sm font-semibold text-foreground"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
                      >
                        2m ago
                      </motion.p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uptime</span>
                      <motion.span
                        key={`uptime-${statsPulse}`}
                        className="font-mono text-foreground"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut', delay: 0.2 }}
                      >
                        99.9%
                      </motion.span>
                    </div>
                  </div>
                </div>
              </CardSurface>
            </div>
          </div>
        </div>

        {/* Audit Log Entry Details Dialog */}
        <Dialog open={selectedEntry !== null} onOpenChange={() => setSelectedEntry(null)}>
          {selectedEntry ? (
            <>
              <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">Entry Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete snapshot of this audit log entry.
                </p>
              </DialogHeader>
              <DialogBody>
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Log ID</label>
                      <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {selectedEntry.id}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Timestamp</label>
                      <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                        {new Date(selectedEntry.at || selectedEntry.created_at || '').toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">User</label>
                      <div className="flex w-full items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                        <AvatarThumbnail
                          name={selectedEntry.user_name}
                          src={selectedEntry.user_avatar}
                          size="sm"
                          className="!h-5 !w-5 text-[10px]"
                        />
                        <span>{selectedEntry.user_name || 'System'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Action</label>
                      <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground capitalize">
                        {selectedEntry.action}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Entity</label>
                    <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                      {selectedEntry.table_name || selectedEntry.entity || 'System'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Change Data</label>
                    <div className="w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm font-mono text-foreground overflow-auto max-h-52">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedEntry.details || {}, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedEntry(null)}
                      className="px-4"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogBody>
            </>
          ) : null}
        </Dialog>

        {/* Action Dialogs - Lazy loaded for performance */}
        {importOpen && (
          <ImportClassesDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            sections={sectionsData ?? []}
            instructors={instructors}
            onImported={load}
          />
        )}
        {addClassOpen && (
          <AddClassDialog
            open={addClassOpen}
            onOpenChange={setAddClassOpen}
            onCreated={load}
          />
        )}
        {addSectionOpen && (
          <AddSectionDialog
            open={addSectionOpen}
            onOpenChange={setAddSectionOpen}
            onCreated={load}
          />
        )}
        {addUserOpen && (
          <AddUserDialog
            open={addUserOpen}
            onOpenChange={setAddUserOpen}
            onCreated={load}
          />
        )}
      </div >
    </div >
  )
}
