import * as React from 'react';
import { cn } from './cn';

export type StatGradient = 'primary' | 'sunset' | 'ocean' | 'violet' | 'none';

const GRADIENT: Record<StatGradient, string> = {
  primary: 'bg-gradient-primary text-white',
  sunset: 'bg-gradient-sunset text-white',
  ocean: 'bg-gradient-ocean text-white',
  violet: 'bg-gradient-violet text-white',
  none: 'bg-card text-strong shadow-card',
};

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  /** Small caption under the value, e.g. "Avg. Completed". */
  hint?: string;
  /** Optional leading icon / glyph node. */
  icon?: React.ReactNode;
  gradient?: StatGradient;
}

/**
 * Headline metric tile. Gradient variants render white text on a coloured
 * gradient (the reference's "83% / 56%" cards); `none` is a plain white card.
 */
export const StatTile = ({
  label,
  value,
  hint,
  icon,
  gradient = 'none',
  className,
  ...props
}: StatTileProps) => {
  const onColor = gradient !== 'none';
  return (
    <div className={cn('rounded-card p-5', GRADIENT[gradient], className)} {...props}>
      <div className="flex items-start justify-between">
        <p className={cn('text-sm font-medium', onColor ? 'text-white/85' : 'text-subtle')}>
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-pill',
              onColor ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-3 text-3xl font-bold tracking-tight',
          onColor ? 'text-white' : 'text-strong',
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cn('mt-1 text-xs', onColor ? 'text-white/80' : 'text-subtle')}>{hint}</p>
      )}
    </div>
  );
};
