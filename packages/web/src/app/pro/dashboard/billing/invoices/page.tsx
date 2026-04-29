import { redirect } from 'next/navigation';

export default function ProBillingHistoryRedirect() {
  redirect('/pro/dashboard/billing?tab=history');
}
