import * as React from 'react';
import { cn } from './cn';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Clamped. */
  value: number;
  /** Optional left label and right value rendered above the track. */
  label?: React.ReactNode;
  caption?: React.ReactNode;
  /** Tailwind bg-* class for the fill. Defaults to the brand gradient. */
  fillClassName?: string;
  /** Track height. */
  size?: 'sm' | 'md';
}

/**
 * Labelled progress / breakdown bar. Reused for profile completion, analytics
 * breakdown rows, and the reference's "developed areas" list.
 */
export const ProgressBar = ({
  value,
  label,
  caption,
  fillClassName = 'bg-gradient-primary',
  size = 'md',
  className,
  ...props
}: ProgressBarProps) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full', className)} {...props}>
      {(label != null || caption != null) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-body">{label}</span>
          <span className="text-subtle">{caption}</span>
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-pill bg-muted',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div className={cn('h-full rounded-pill', fillClassName)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
