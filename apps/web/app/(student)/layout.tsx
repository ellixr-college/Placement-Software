import { SessionProvider } from '../../lib/session';
import { ConfirmProvider } from '../../components/confirm-provider';
import { MobileBottomNav } from '../../components/mobile-bottom-nav';

/** Mobile-first shell for the Student experience (PWA-installable). */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <div className="mx-auto flex min-h-screen max-w-md flex-col bg-app">
          <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
          <MobileBottomNav />
        </div>
      </ConfirmProvider>
    </SessionProvider>
  );
}
