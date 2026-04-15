import { redirect } from 'next/navigation';

type LoginRedirectPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginRedirectPage({ searchParams }: LoginRedirectPageProps) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) params.append(key, entry);
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  redirect(query ? `/pro/login?${query}` : '/pro/login');
}
