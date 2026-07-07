import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-primary text-primary-foreground shadow-nav hover:opacity-95',
        outline: 'border border-primary-500 text-primary-600 hover:bg-primary-50',
        ghost: 'text-primary-600 hover:bg-primary-50',
        danger: 'bg-danger text-white hover:opacity-95',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-5',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * Force the loading state on. Usually unnecessary: if `onClick` returns a
   * promise the Button tracks it automatically. Use this for `<form>` submit
   * buttons that have no `onClick` — pass the form's in-flight flag, e.g.
   * `loading={saving}`. Set `autoLoading={false}` to opt out of auto-tracking.
   */
  loading?: boolean;
  /** Auto-show the spinner while an async `onClick` is pending. Default: true. */
  autoLoading?: boolean;
}

/**
 * A button with built-in async feedback. Any `onClick` that returns a promise
 * (i.e. an `async` handler) makes the button show a spinner, disable itself, and
 * ignore further clicks until the promise settles — so slow submits give clear
 * feedback and can never be double-fired. No per-button wiring required.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      autoLoading = true,
      disabled,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [pending, setPending] = React.useState(false);
    const mounted = React.useRef(true);
    // Synchronous guard: blocks a second click that lands before React re-renders.
    const inFlight = React.useRef(false);
    React.useEffect(() => () => void (mounted.current = false), []);

    const busy = loading || pending;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (busy || inFlight.current) return;
      const result = onClick?.(e) as unknown;
      if (autoLoading && result && typeof (result as Promise<unknown>).then === 'function') {
        inFlight.current = true;
        setPending(true);
        Promise.resolve(result).finally(() => {
          inFlight.current = false;
          if (mounted.current) setPending(false);
        });
      }
    };

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), busy && 'cursor-wait', className)}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        onClick={handleClick}
        {...props}
      >
        {busy && <Spinner />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}

export { buttonVariants };
