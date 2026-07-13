'use client';

import { Badge, Card } from '@ellixr/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import { ApplicationTimeline } from '../../../../components/application-timeline';
import { ListSkeleton } from '../../../../components/page-skeleton';
import {
  listMyApplications,
  withdrawApplication,
  type Application,
} from '../../../../lib/applications';
import { formatLpa } from '../../../../lib/jobs';
import { mutate, useApi } from '../../../../lib/use-api';

const STATUS: Record<string, { label: string; tint: 'mint' | 'rose' | 'cream' | 'lavender' }> = {
  APPLIED: { label: 'Applied', tint: 'cream' },
  IN_PROGRESS: { label: 'In progress', tint: 'lavender' },
  SELECTED: { label: 'Selected', tint: 'mint' },
  REJECTED: { label: 'Not selected', tint: 'rose' },
  WITHDRAWN: { label: 'Withdrawn', tint: 'cream' },
};

const APPS_KEY = '/student/applications';

export default function MyApplicationsPage() {
  const confirm = useConfirm();
  const {
    data: apps,
    error,
    isLoading,
    mutate: mutateApps,
  } = useApi<Application[]>(APPS_KEY, listMyApplications);

  async function withdraw(id: string) {
    const ok = await confirm({
      title: 'Withdraw this application?',
      message: 'You will be removed from this job. This cannot be undone.',
      acknowledgement: 'I understand I can’t re-apply.',
      confirmLabel: 'Withdraw',
      destructive: true,
    });
    if (!ok) return;
    try {
      await withdrawApplication(id);
      // Optimistically update local list, then revalidate.
      if (apps) {
        mutateApps(
          apps.map((a) =>
            a.id === id ? { ...a, status: 'WITHDRAWN', stage: 'WITHDRAWN' } : a,
          ) as Application[],
          false,
        );
      }
      await mutate(APPS_KEY);
      await mutate('/student/jobs');
    } catch (err) {
      // Revert optimistic update on failure by revalidating.
      await mutate(APPS_KEY);
      alert(err instanceof Error ? err.message : 'Could not withdraw');
    }
  }

  if (isLoading || !apps) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-strong">My applications</h1>
        <p className="text-sm text-subtle">{apps.length} application(s)</p>
      </header>

      {error && <p className="text-sm text-danger">{error.message}</p>}

      {apps.length === 0 ? (
        <Card className="p-6 text-center text-sm text-subtle">
          You haven&apos;t applied to any jobs yet.
        </Card>
      ) : (
        apps.map((a, i) => {
          const st = STATUS[a.status] ?? { label: a.status, tint: 'cream' as const };
          const canWithdraw = a.status === 'APPLIED' || a.status === 'IN_PROGRESS';
          return (
            <Card
              key={a.id}
              className="animate-rise space-y-4 p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-strong">{a.job.title}</h2>
                  <p className="text-sm text-subtle">{a.job.company.name}</p>
                </div>
                <Badge tint={st.tint}>{st.label}</Badge>
              </div>

              <ApplicationTimeline app={a} />

              {a.status === 'SELECTED' && (
                <div className="flex flex-wrap items-center gap-3 rounded-md bg-success/10 px-3 py-2">
                  <span className="text-sm font-medium text-success">
                    🎉 You&apos;ve been selected!
                  </span>
                  {a.offerCtc != null && (
                    <span className="text-sm text-body">{formatLpa(a.offerCtc)}</span>
                  )}
                  {a.offerLetterUrl && (
                    <a
                      href={a.offerLetterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary-600 hover:underline"
                    >
                      View offer letter
                    </a>
                  )}
                </div>
              )}

              {canWithdraw && (
                <div className="flex justify-end">
                  <button
                    onClick={() => withdraw(a.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Withdraw
                  </button>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
