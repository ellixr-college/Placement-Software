export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
