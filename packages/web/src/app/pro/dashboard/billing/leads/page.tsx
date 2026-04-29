import { redirect } from 'next/navigation';

export default function ProLeadFeesRedirect() {
  redirect('/pro/dashboard/billing?tab=lead-fees');
}
