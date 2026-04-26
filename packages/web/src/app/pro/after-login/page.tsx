'use client';

/**
 * /pro/after-login — smart post-login redirect hub
 *
 * This page is used as the `callbackUrl` for all pro social-auth (Google/Apple) sign-ins.
 * It fetches the pro's current status and does a SINGLE router.replace() to the correct
 * destination, eliminating the visible redirect chain that happened when the callback
 * went to /onboarding/account-setup → marketplace-profile → review-status.
 *
 * Flow:
 *   New pro (no record / ONBOARDING + account_setup_done=false) → /onboarding/account-setup
 *   ONBOARDING + account_setup_done=true                        → /onboarding/marketplace-profile
 *   PENDING_REVIEW / REJECTED / SUSPENDED                       → /pro/review-status
 *   ACTIVE                                                       → /pro/dashboard
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { IconLoader2 } from '@tabler/icons-react';

export default function ProAfterLoginPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  // Guard: ensure we only navigate once even if sessionStatus oscillates
  // (NextAuth can briefly re-enter 'loading' on window focus refetch during
  // the OAuth redirect, queuing multiple router.replace() calls that cause
  // the browser's history.replaceState() rate-limit to be hit).
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (hasNavigated.current) return;

    if (sessionStatus === 'unauthenticated') {
      hasNavigated.current = true;
      router.replace('/pro/login');
      return;
    }

    // Authenticated — fetch pro status and redirect once
    apiClient
      .getMyPro()
      .then((pro: any) => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        const status: string = pro?.status ?? '';

        if (status === 'ACTIVE') {
          router.replace('/pro/dashboard');
          return;
        }

        if (
          status === 'PENDING_REVIEW' ||
          status === 'REJECTED' ||
          status === 'SUSPENDED'
        ) {
          router.replace('/pro/review-status');
          return;
        }

        // ONBOARDING status (or unknown) — route based on setup progress
        if (!pro?.account_setup_done) {
          router.replace('/onboarding/account-setup');
        } else if (!pro?.marketplace_profile_completed) {
          router.replace('/onboarding/marketplace-profile');
        } else {
          // Setup and marketplace profile done — final step is billing
          router.replace('/onboarding/billing');
        }
      })
      .catch(() => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        // No pro record yet → brand new user, start onboarding
        router.replace('/onboarding/account-setup');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]); // router is intentionally omitted — it is stable and including it
                       // caused the effect to re-fire after router.replace(), producing a loop.

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <IconLoader2 className="mx-auto h-9 w-9 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm text-slate-500">Getting your account ready…</p>
      </div>
    </div>
  );
}
