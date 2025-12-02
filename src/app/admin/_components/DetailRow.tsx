import { Skeleton } from '@/components/ui/Skeleton'

type DetailRowProps = {
    label: string
    value: React.ReactNode
    loading?: boolean
}

export function DetailRow({ label, value, loading }: DetailRowProps) {
    return (
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
            <dt className="min-w-[120px] text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">
                {loading ? (
                    <Skeleton className="h-5 w-32" />
                ) : (
                    value ?? '-'
                )}
            </dd>
        </div>
    )
}
