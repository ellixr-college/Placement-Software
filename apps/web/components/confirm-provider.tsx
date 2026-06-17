'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from '@ellixr/ui';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If set, the user must tick a checkbox with this label before confirming. */
  acknowledgement?: string;
  /** Renders the confirm button in the danger style. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Returns an async `confirm(options)` that resolves true/false. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

/**
 * Provides an in-app confirmation modal (replacement for window.confirm) with an
 * optional acknowledgement checkbox. Mount once per shell; consume via useConfirm.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [checked, setChecked] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setChecked(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  const canConfirm = !opts?.acknowledgement || checked;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-md rounded-card border border-border bg-white p-6 shadow-nav"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-strong">{opts.title}</h2>
            {opts.message != null && (
              <div className="mt-2 whitespace-pre-line text-sm text-body">{opts.message}</div>
            )}
            {opts.acknowledgement && (
              <label className="mt-4 flex items-start gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
                />
                <span>{opts.acknowledgement}</span>
              </label>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                {opts.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant={opts.destructive ? 'danger' : 'primary'}
                onClick={() => close(true)}
                disabled={!canConfirm}
              >
                {opts.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
