export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[rgba(15,23,42,0.08)] ${className}`.trim()} />
}
