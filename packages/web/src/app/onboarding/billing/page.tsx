'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { IconCheck, IconLoader2, IconArrowRight, IconCoin } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export default function OnboardingBillingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getMyPro()
      .then((pro: any) => {
        const status = pro?.status;
        if (status === 'ACTIVE') {
          router.replace('/pro/dashboard');
          return;
        }
        if (status === 'PENDING_REVIEW' || status === 'REJECTED' || status === 'SUSPENDED') {
          router.replace('/pro/review-status');
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      try {
        await apiClient.activateStarterPlan();
      } catch {
        // Non-critical if endpoint isn't available yet
      }
      router.replace('/pro/review-status');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <IconLoader2 className="h-7 w-7 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <IconCoin className="h-8 w-8 text-emerald-600" stroke={1.8} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            How lead fees work
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            HandyCall is free to join — no monthly subscription, ever.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <ul className="space-y-5">
            {[
              {
                label: 'Your profile is completely free',
                sub: 'Creating and maintaining your listing costs nothing. You can update your services and districts at any time.',
              },
              {
                label: 'Reviewing requests is always free',
                sub: 'Job requests arrive in your inbox. You can see the job description and location before making any decision.',
              },
              {
                label: 'A lead fee applies when you accept',
                sub: 'When you choose to accept a customer\'s request, a lead fee is charged and their full contact details and a direct chat are unlocked.',
              },
              {
                label: 'Declining costs nothing',
                sub: 'If a request isn\'t the right fit, decline it for free — no charge, no commitment.',
              },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <IconCheck className="h-3.5 w-3.5 text-emerald-600" stroke={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{item.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-[15px] font-semibold text-white',
              'shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {saving ? (
              <IconLoader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Submit for review
                <IconArrowRight className="h-5 w-5" stroke={2.5} />
              </>
            )}
          </button>
          <p className="text-xs text-slate-400">
            You won&apos;t be charged until you accept your first customer request.
          </p>
        </div>
      </div>
    </div>
  );
}
