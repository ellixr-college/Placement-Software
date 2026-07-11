'use client';

import { Card } from '@ellixr/ui';

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-app ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Classic card skeleton: a rounded block on top + two lines below. */
export function CardSkeleton({ blocks = 1 }: { blocks?: number }) {
  return (
    <Card className="space-y-4 p-5">
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </Card>
  );
}

/** Full-page skeleton for simple form/card pages. */
export function PageSkeleton({ cardHeight = 320 }: { cardHeight?: number }) {
  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </header>
      <Card className="space-y-5 p-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="w-full rounded-xl" style={{ height: cardHeight }} />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </Card>
    </div>
  );
}

/** Compact skeleton for list/feed pages (header + list of rows/cards). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </header>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for detail pages (title + metadata + main content block). */
export function DetailSkeleton() {
  return (
    <div className="space-y-5 pb-4">
      <header className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-full max-w-md" />
        <Skeleton className="h-3 w-40" />
      </header>
      <Card className="space-y-4 p-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </Card>
    </div>
  );
}

/** Tiny inline skeleton for buttons, badges, or small areas. */
export function InlineSkeleton({ width = 'w-20', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <span
      className={`inline-block ${height} ${width} animate-pulse rounded-md bg-app`}
      aria-hidden="true"
    />
  );
}
