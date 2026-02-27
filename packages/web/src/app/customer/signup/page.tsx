import { redirect } from 'next/navigation';

export default function CustomerSignupPage() {
  redirect('/register?audience=customer');
}
