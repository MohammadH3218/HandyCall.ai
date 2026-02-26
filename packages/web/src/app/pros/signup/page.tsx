import { redirect } from 'next/navigation';

export default function ProsSignupPage() {
  redirect('/register?audience=pro');
}
