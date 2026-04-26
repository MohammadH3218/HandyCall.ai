import { redirect } from 'next/navigation';

export default function CustomerDashboardHome() {
  redirect('/customer/dashboard/requests');
}
