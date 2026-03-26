'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-md border border-border/50">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-md border border-border/50">
      <Skeleton className="h-4 w-1/4 mb-4" />
      <div className="h-64 flex items-end gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${20 + (i * 10) % 80}%` }}
          />
        ))}
      </div>
    </div>
  )
}
