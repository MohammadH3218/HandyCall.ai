'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface SocialAuthButtonsProps {
  audience: 'customer' | 'pro';
  callbackUrl: string;
}

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.8 12.23c0-.75-.07-1.47-.19-2.15H12v4.07h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.77 3.04-4.4 3.04-7.56Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.46l-3.3-2.56c-.91.61-2.07.98-3.47.98-2.66 0-4.91-1.8-5.71-4.21H2.88v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.29 13.75A6 6 0 0 1 5.97 12c0-.61.11-1.2.32-1.75V7.61H2.88A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.39l3.21-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.04c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.07 2.99 14.75 2 12 2A10 10 0 0 0 3.08 7.61l3.21 2.64c.8-2.41 3.05-4.21 5.71-4.21Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 fill-slate-900"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M15.22 12.03c.02 2.24 1.96 2.98 1.98 2.99-.02.05-.31 1.07-1.02 2.12-.61.91-1.25 1.81-2.25 1.83-.98.02-1.29-.58-2.42-.58-1.13 0-1.48.56-2.4.6-.96.03-1.7-.96-2.32-1.86-1.27-1.84-2.24-5.2-.94-7.46.64-1.12 1.78-1.83 3.01-1.85.94-.02 1.83.63 2.42.63.59 0 1.7-.78 2.86-.67.49.02 1.87.2 2.75 1.49-.07.05-1.64.96-1.67 2.76Zm-1.97-6.8c.51-.62.86-1.49.77-2.35-.74.03-1.63.49-2.16 1.11-.47.54-.88 1.42-.77 2.26.82.06 1.65-.42 2.16-1.02Z" />
    </svg>
  );
}

const PROVIDERS = {
  customer: [
    { id: 'cognito-google-customer', label: 'Continue with Google', Logo: GoogleLogo },
    { id: 'cognito-apple-customer', label: 'Continue with Apple', Logo: AppleLogo },
  ],
  pro: [
    { id: 'cognito-google', label: 'Continue with Google', Logo: GoogleLogo },
    { id: 'cognito-apple', label: 'Continue with Apple', Logo: AppleLogo },
  ],
} as const;

export function SocialAuthButtons({ audience, callbackUrl }: SocialAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {PROVIDERS[audience].map(({ id, label, Logo }) => (
        <button
          key={id}
          type="button"
          disabled={pendingProvider !== null}
          onClick={() => {
            setPendingProvider(id);
            void signIn(id, { callbackUrl });
          }}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Logo />
          <span>{pendingProvider === id ? 'Redirecting...' : label}</span>
        </button>
      ))}
    </div>
  );
}
