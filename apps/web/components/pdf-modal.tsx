'use client';

/** Full-screen PDF preview (renders the file in an iframe). Controlled: mount it
 * when a URL is selected, pass onClose to dismiss. Falls back to a new-tab link. */
export function PdfModal({
  url,
  name,
  onClose,
}: {
  url: string;
  name?: string | null;
  onClose: () => void;
}) {
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
            {/* download works on mobile (where inline iframe PDF doesn't render) */}
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
        {/* Inline preview works on desktop; phones show a placeholder, so we show a
            prominent Download button below that hands the file to the PDF viewer. */}
        <iframe src={url} title={name ?? 'PDF'} className="hidden h-full w-full flex-1 sm:block" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center sm:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-danger/10 text-sm font-bold text-danger">
            PDF
          </div>
          <p className="text-sm text-subtle">Tap below to open the job description.</p>
          <a
            href={url}
            download={name ?? 'job.pdf'}
            className="rounded-pill bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Open PDF
          </a>
        </div>
      </div>
    </div>
  );
}
