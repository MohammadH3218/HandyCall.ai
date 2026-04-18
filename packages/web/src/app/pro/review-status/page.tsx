'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';

type ProStatus = 'PENDING_REVIEW' | 'REJECTED' | 'ACTIVE' | 'SUSPENDED' | string;

export default function ReviewStatusPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/pro/login');
      return;
    }
    if (!isLoading && isAuthenticated) {
      apiClient.getMyPro()
        .then((pro: any) => {
          const status: ProStatus = pro?.status ?? 'PENDING_REVIEW';
          setProStatus(status);
          if (pro?.rejection_reason) setRejectionReason(pro.rejection_reason);
          // If already approved, redirect to dashboard
          if (status === 'ACTIVE') {
            router.replace('/pro/dashboard');
          }
        })
        .catch(() => {
          setProStatus('PENDING_REVIEW');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isAuthenticated, isLoading, router]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/">
            <Logo width={130} height={32} />
          </Link>
          <button
            type="button"
            onClick={() => logout('/pro/login')}
            className="text-sm text-slate-500 transition hover:text-slate-700"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {proStatus === 'REJECTED' ? (
            <RejectedState reason={rejectionReason} />
          ) : proStatus === 'SUSPENDED' ? (
            <SuspendedState />
          ) : (
            <PendingState />
          )}
        </div>
      </main>
    </div>
  );
}

function PendingState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {/* Icon */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-slate-900">Your profile is under review</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        We've received your application and our team is currently reviewing your profile. This typically
        takes <strong className="text-slate-700">1–2 business days</strong>.
      </p>

      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You'll receive an email at your registered address once a decision has been made.
        Check your spam folder if you don't see it.
      </div>

      <div className="mt-6 space-y-2 text-sm text-slate-500">
        <p>While you wait, you can:</p>
        <ul className="mt-2 space-y-1 text-left">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">✓</span>
            Prepare photos of your recent work to add once approved
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">✓</span>
            Review your service offerings to make sure they're accurate
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">✓</span>
            Contact us at{' '}
            <a href="mailto:hello@handycall.org" className="text-emerald-600 hover:underline">
              hello@handycall.org
            </a>{' '}
            if you have questions
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        Check status
      </button>
    </div>
  );
}

function RejectedState({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      {/* Icon */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-slate-900">Application not approved</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        After reviewing your profile, we were unable to approve your application at this time.
      </p>

      {reason ? (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm">
          <p className="mb-1 font-semibold text-red-800">Reason provided:</p>
          <p className="text-red-700">{reason}</p>
        </div>
      ) : null}

      <div className="mt-6 space-y-3 text-sm text-slate-600">
        <p>
          You can address the issues above and reapply, or contact us to discuss further:
        </p>
        <a
          href="mailto:hello@handycall.org"
          className="block rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700"
        >
          Contact hello@handycall.org
        </a>
      </div>

      <Link
        href="/"
        className="mt-4 block text-sm text-slate-400 transition hover:text-slate-600"
      >
        Return to homepage
      </Link>
    </div>
  );
}

function SuspendedState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <svg className="h-8 w-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M10 9v6M14 9v6" strokeLinecap="round" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-slate-900">Account suspended</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Your account has been temporarily suspended. Please contact us to resolve this.
      </p>

      <a
        href="mailto:hello@handycall.org"
        className="mt-6 block rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Contact hello@handycall.org
      </a>
    </div>
  );
}
