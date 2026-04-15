import { redirect } from 'next/navigation';

export default function AdminLoginPage() {
  redirect('/pro/login?audience=admin');
}
