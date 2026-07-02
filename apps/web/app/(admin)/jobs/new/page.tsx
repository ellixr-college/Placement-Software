import { redirect } from 'next/navigation';

// The full job form has been retired — PDF upload is now the single way to post a
// job. Keep this route working (old links/bookmarks) by redirecting to it.
export default function NewJobRedirect() {
  redirect('/jobs/quick');
}
