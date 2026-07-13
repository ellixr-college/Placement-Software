/**
 * Admin shell page-transition wrapper. Next.js re-mounts the template on every
 * navigation, so each screen gets a soft fade/slide entrance.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
