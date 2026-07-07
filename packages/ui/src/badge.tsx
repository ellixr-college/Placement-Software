import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badgeVariants = cva('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', {
  variants: {
    tint: {
      lavender: 'bg-tint-lavender text-tint-lavender-fg',
      mint: 'bg-tint-mint text-tint-mint-fg',
      cream: 'bg-tint-cream text-tint-cream-fg',
      rose: 'bg-tint-rose text-tint-rose-fg',
      primary: 'bg-primary-50 text-primary-700',
    },
  },
  defaultVariants: { tint: 'primary' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, tint, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tint }), className)} {...props} />
);
