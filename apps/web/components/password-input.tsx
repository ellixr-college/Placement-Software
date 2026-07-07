'use client';

import { useState } from 'react';
import { cn } from '@ellixr/ui';

/**
 * Text input that masks its value with a show/hide eye toggle. Forwards all
 * native input props; pass the same `className` you'd use on a plain input —
 * room for the icon is added automatically.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={cn(className, 'pr-10')} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-subtle transition hover:text-strong"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.6A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a16.8 16.8 0 0 1-3.4 4.3M6.6 6.6A16.7 16.7 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.4-.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
