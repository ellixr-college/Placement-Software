import { SessionProvider } from '../../lib/session';
import { ConfirmProvider } from '../../components/confirm-provider';
import { AdminSidebar } from '../../components/admin-sidebar';
import { AdminTopbar } from '../../components/admin-topbar';

/** Desktop web shell for Platform Admin / College Admin / Placement Officer. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <div className="flex min-h-screen bg-app">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar />
            <main className="flex-1 p-8">{children}</main>
          </div>
        </div>
      </ConfirmProvider>
    </SessionProvider>
  );
}
