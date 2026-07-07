'use client';

export interface Crumb {
  label: string;
  onClick?: () => void;
}

/** Horizontal breadcrumb trail. The last crumb is the current page and is not
 * clickable; earlier crumbs render as subtle buttons. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 text-subtle"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isLast || !crumb.onClick ? (
                <span
                  className={`${isLast ? 'font-medium text-strong' : 'text-subtle'}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <button
                  onClick={crumb.onClick}
                  className="rounded-sm text-subtle transition hover:text-primary-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                >
                  {crumb.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
