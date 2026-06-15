import * as React from 'react';
import { cn } from './cn';

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional right-aligned header slot (actions, filters, "See all" link). */
  action?: React.ReactNode;
  /** Remove inner body padding (e.g. for full-bleed tables). */
  flush?: boolean;
}

/**
 * Standard white section container with an optional title/subtitle/action header.
 * Replaces the ad-hoc `<Card>` + heading markup repeated across pages.
 */
export const SectionCard = ({
  title,
  subtitle,
  action,
  flush,
  className,
  children,
  ...props
}: SectionCardProps) => (
  <div
    className={cn('rounded-card border border-border bg-card shadow-card', className)}
    {...props}
  >
    {(title != null || action != null) && (
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          {title != null && <h2 className="text-base font-semibold text-strong">{title}</h2>}
          {subtitle != null && <p className="mt-0.5 text-sm text-subtle">{subtitle}</p>}
        </div>
        {action != null && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className={cn(flush ? '' : 'p-5', (title != null || action != null) && !flush && 'pt-4')}>
      {children}
    </div>
  </div>
);
