import { redirect } from 'next/navigation';

export default function ProPaymentMethodsRedirect() {
  redirect('/pro/dashboard/billing?tab=payment-methods');
}
