'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Full-screen PDF preview. Renders every page to a <canvas> with pdf.js so the
 * JD is readable inline on phones (a plain <iframe>/<embed> PDF won't render on
 * most mobile browsers). `url` is the public Vercel Blob URL; the caller is
 * responsible for managing the modal lifecycle. Download/Open links stay as an
 * escape hatch.
 *
 * The worker is served from /public/pdf.worker.min.js (copied from pdfjs-dist —
 * re-copy it if the pdfjs-dist version is bumped).
 */
export function PdfModal({
  url,
  name,
  onClose,
}: {
  url: string;
  name?: string | null;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let pdfDoc: {
      numPages: number;
      getPage: (n: number) => Promise<unknown>;
      destroy: () => void;
    } | null = null;

    (async () => {
      setStatus('loading');
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        pdfDoc = doc as unknown as typeof pdfDoc;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Fit the page to the viewer width (cap so it isn't huge on desktop).
        const cssWidth = Math.min(container.clientWidth || 320, 900);

        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (cssWidth * dpr) / base.width });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = 'auto';
          canvas.style.maxWidth = '100%';
          canvas.className = 'mx-auto mb-3 rounded border border-border bg-white shadow-sm';
          container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try {
        pdfDoc?.destroy();
      } catch {
        /* noop */
      }
    };
  }, [url]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-card bg-white shadow-nav"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-strong">{name ?? 'Job description'}</p>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href={url}
              download={name ?? 'job.pdf'}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Download
            </a>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Open
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-subtle transition hover:bg-app hover:text-strong"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable page area — canvases are appended into containerRef. */}
        <div className="flex-1 overflow-auto bg-app p-3">
          {status === 'loading' && (
            <p className="py-10 text-center text-sm text-subtle">Loading job description…</p>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-danger/10 text-sm font-bold text-danger">
                PDF
              </div>
              <p className="text-sm text-subtle">Couldn&rsquo;t preview this PDF here.</p>
              <a
                href={url}
                download={name ?? 'job.pdf'}
                className="rounded-pill bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white"
              >
                Download PDF
              </a>
            </div>
          )}
          <div ref={containerRef} className={status === 'error' ? 'hidden' : ''} />
        </div>
      </div>
    </div>
  );
}
