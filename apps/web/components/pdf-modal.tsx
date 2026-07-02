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
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Open in new tab
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
        <iframe src={url} title={name ?? 'PDF'} className="h-full w-full flex-1" />
      </div>
    </div>
  );
}
