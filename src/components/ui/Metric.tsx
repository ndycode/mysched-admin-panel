'use client'
import React from 'react'
/**
 * MetricTitle: Title for a metric card
 * @param children - Metric title content
 */
export function MetricTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-xs font-medium text-muted-foreground ${className}`.trim()}>{children}</div>
}
/**
 * MetricValue: Value for a metric card
 * @param children - Metric value content
 */
export function MetricValue({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-2 text-4xl font-bold text-[color:var(--brand-500)] ${className}`.trim()}>{children}</div>
}
export function Subtext({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm text-muted-foreground ${className}`.trim()}>{children}</div>
}

