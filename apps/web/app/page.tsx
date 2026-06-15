import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware handles authed routing; unauthenticated lands on login.
  redirect('/login');
}
