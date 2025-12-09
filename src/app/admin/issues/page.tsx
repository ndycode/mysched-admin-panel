'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    RefreshCw,
    XCircle,
} from 'lucide-react'
import { format } from 'date-fns'

import { api } from '@/lib/fetcher'
import { useToast } from '@/components/toast'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { CardSurface, StatsCard, StatusPill } from '../_components/design-system'
import { AnimatedTabs } from '../_components/AnimatedTabs'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'


type IssueReport = {
    id: number
    userId: string
    classId: number
    sectionId: number | null
    note: string | null
    snapshot: Record<string, unknown>
    status: string
    createdAt: string
    resolutionNote: string | null
    reporter: {
        name: string | null
        email: string | null
        avatarUrl: string | null
    } | null
    classInfo: {
        id: number
        title: string | null
        code: string | null
        room: string | null
        day: string | null
        start: string | null
        end: string | null
    } | null
}

const STATUS_TABS = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'ignored', label: 'Ignored' },
]

function formatTimeAgo(date: Date | string) {
    const d = new Date(date)
    const now = new Date()
    const diff = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))

    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

export default function IssueReportsPage() {
    const toast = useToast()
    const [reports, setReports] = useState<IssueReport[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [updatingId, setUpdatingId] = useState<number | null>(null)
    const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null)

    const loadReports = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await api<IssueReport[]>('/api/issue-reports')
            setReports(data)
        } catch (err) {
            setError((err as Error).message || 'Failed to load reports')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadReports()
    }, [loadReports])

    const filteredReports = useMemo(() => {
        if (statusFilter === 'all') return reports
        return reports.filter(r => r.status === statusFilter)
    }, [reports, statusFilter])

    const stats = useMemo(() => ({
        total: reports.length,
        pending: reports.filter(r => r.status === 'new').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
        ignored: reports.filter(r => r.status === 'ignored').length,
    }), [reports])

    const updateStatus = async (id: number, status: 'resolved' | 'ignored') => {
        setUpdatingId(id)
        try {
            await api('/api/issue-reports', {
                method: 'PATCH',
                body: JSON.stringify({ id, status }),
            })
            setReports(prev =>
                prev.map(r => (r.id === id ? { ...r, status } : r))
            )
            toast({ kind: 'success', msg: `Report marked as ${status}` })
        } catch (err) {
            toast({ kind: 'error', msg: (err as Error).message || 'Failed to update' })
        } finally {
            setUpdatingId(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new':
                return <StatusPill tone="warning">Pending</StatusPill>
            case 'resolved':
                return <StatusPill tone="success">Resolved</StatusPill>
            case 'ignored':
                return <StatusPill tone="info">Ignored</StatusPill>
            default:
                return <StatusPill tone="info">{status}</StatusPill>
        }
    }

    return (
        <div className="min-h-screen bg-background p-6 lg:p-10">
            <div className="mx-auto max-w-screen-xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Issue Reports</h1>
                        <p className="text-muted-foreground">
                            Review and manage user-submitted class schedule issues.
                        </p>
                    </div>
                    <AnimatedActionBtn
                        icon={RefreshCw}
                        label="Reload"
                        onClick={loadReports}
                        isLoading={loading}
                        loadingLabel="Loading..."
                        variant="secondary"
                        spinner="framer"
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
                    <StatsCard
                        icon={AlertTriangle}
                        label="Total Reports"
                        value={String(stats.total)}
                        className="shadow-sm border-border"
                    />
                    <StatsCard
                        icon={Clock}
                        label="Pending"
                        value={String(stats.pending)}
                        className="shadow-sm border-border"
                    />
                    <StatsCard
                        icon={CheckCircle}
                        label="Resolved"
                        value={String(stats.resolved)}
                        className="shadow-sm border-border"
                    />
                    <StatsCard
                        icon={XCircle}
                        label="Ignored"
                        value={String(stats.ignored)}
                        className="shadow-sm border-border"
                    />
                </div>

                {/* Filters */}
                <CardSurface className="p-4 shadow-sm border-border">
                    <AnimatedTabs
                        tabs={STATUS_TABS}
                        activeTab={statusFilter}
                        onTabChange={setStatusFilter}
                        layoutId="issue-status-tabs"
                    />
                </CardSurface>

                {/* Reports List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <CardSurface key={i} className="p-6 shadow-sm border-border">
                                    <div className="flex items-start gap-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-2/3" />
                                        </div>
                                    </div>
                                </CardSurface>
                            ))}
                        </div>
                    ) : error ? (
                        <CardSurface className="p-6 text-center text-destructive shadow-sm border-border">
                            {error}
                        </CardSurface>
                    ) : filteredReports.length === 0 ? (
                        <CardSurface className="p-10 text-center shadow-sm border-border">
                            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">
                                {statusFilter === 'all'
                                    ? 'No issue reports yet.'
                                    : `No ${statusFilter} reports.`}
                            </p>
                        </CardSurface>
                    ) : (
                        filteredReports.map(report => (
                            <CardSurface
                                key={report.id}
                                className="p-6 shadow-sm border-border hover:border-border/80 transition-colors cursor-pointer"
                                onClick={() => setSelectedReport(report)}
                            >
                                <div className="flex items-start gap-4">
                                    <AvatarThumbnail
                                        name={report.reporter?.name ?? 'User'}
                                        src={report.reporter?.avatarUrl}
                                        size="md"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {report.reporter?.name || 'Unknown User'}
                                                </span>
                                                {getStatusBadge(report.status)}
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatTimeAgo(report.createdAt)}
                                            </span>
                                        </div>

                                        {report.classInfo && (
                                            <p className="text-sm text-muted-foreground mb-2">
                                                <span className="font-medium text-foreground/80">
                                                    {report.classInfo.title || report.classInfo.code}
                                                </span>
                                                {report.classInfo.day && (
                                                    <span> • {report.classInfo.day}</span>
                                                )}
                                                {report.classInfo.start && report.classInfo.end && (
                                                    <span> • {report.classInfo.start} - {report.classInfo.end}</span>
                                                )}
                                                {report.classInfo.room && (
                                                    <span> • {report.classInfo.room}</span>
                                                )}
                                            </p>
                                        )}

                                        <p className="text-sm text-foreground line-clamp-2">
                                            {report.note || 'No description provided.'}
                                        </p>

                                        {report.status === 'new' && (
                                            <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                                                <AnimatedActionBtn
                                                    icon={CheckCircle}
                                                    label="Resolve"
                                                    onClick={() => updateStatus(report.id, 'resolved')}
                                                    isLoading={updatingId === report.id}
                                                    loadingLabel="..."
                                                    variant="primary"
                                                    className="h-8 px-3 text-xs"
                                                />
                                                <AnimatedActionBtn
                                                    icon={XCircle}
                                                    label="Ignore"
                                                    onClick={() => updateStatus(report.id, 'ignored')}
                                                    isLoading={updatingId === report.id}
                                                    loadingLabel="..."
                                                    variant="secondary"
                                                    className="h-8 px-3 text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardSurface>
                        ))
                    )}
                </div>

                {/* Detail Dialog */}
                <Dialog
                    open={selectedReport !== null}
                    onOpenChange={(open) => !open && setSelectedReport(null)}
                    className="max-w-2xl"
                >
                    {selectedReport && (
                        <>
                            <DialogHeader>
                                <h2 className="text-xl font-semibold text-foreground">
                                    Issue Report #{selectedReport.id}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Submitted {format(new Date(selectedReport.createdAt), 'PPpp')}
                                </p>
                            </DialogHeader>
                            <DialogBody>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <AvatarThumbnail
                                            name={selectedReport.reporter?.name ?? 'User'}
                                            src={selectedReport.reporter?.avatarUrl}
                                            size="md"
                                        />
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {selectedReport.reporter?.name || 'Unknown User'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedReport.reporter?.email || 'No email'}
                                            </p>
                                        </div>
                                        <div className="ml-auto">
                                            {getStatusBadge(selectedReport.status)}
                                        </div>
                                    </div>

                                    {selectedReport.classInfo && (
                                        <div className="rounded-lg bg-muted/50 p-4">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                                Class Information
                                            </h4>
                                            <p className="font-semibold text-foreground">
                                                {selectedReport.classInfo.title || selectedReport.classInfo.code}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {[
                                                    selectedReport.classInfo.code,
                                                    selectedReport.classInfo.day,
                                                    selectedReport.classInfo.start && selectedReport.classInfo.end
                                                        ? `${selectedReport.classInfo.start} - ${selectedReport.classInfo.end}`
                                                        : null,
                                                    selectedReport.classInfo.room,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                            Issue Description
                                        </h4>
                                        <p className="text-foreground">
                                            {selectedReport.note || 'No description provided.'}
                                        </p>
                                    </div>

                                    {selectedReport.snapshot && Object.keys(selectedReport.snapshot).length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                                Snapshot at Report Time
                                            </h4>
                                            <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-auto max-h-48">
                                                {JSON.stringify(selectedReport.snapshot, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {selectedReport.status === 'new' && (
                                        <div className="flex gap-3 pt-4 border-t border-border">
                                            <AnimatedActionBtn
                                                icon={CheckCircle}
                                                label="Mark as Resolved"
                                                onClick={() => {
                                                    updateStatus(selectedReport.id, 'resolved')
                                                    setSelectedReport(null)
                                                }}
                                                isLoading={updatingId === selectedReport.id}
                                                variant="primary"
                                            />
                                            <AnimatedActionBtn
                                                icon={XCircle}
                                                label="Mark as Ignored"
                                                onClick={() => {
                                                    updateStatus(selectedReport.id, 'ignored')
                                                    setSelectedReport(null)
                                                }}
                                                isLoading={updatingId === selectedReport.id}
                                                variant="secondary"
                                            />
                                        </div>
                                    )}
                                </div>
                            </DialogBody>
                        </>
                    )}
                </Dialog>
            </div>
        </div>
    )
}
