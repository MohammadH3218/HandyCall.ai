'use client';

/**
 * /pro/after-login — smart post-login redirect hub
 *
 * This page is used as the `callbackUrl` for all pro social-auth (Google/Apple) sign-ins.
 * It fetches the pro's current status and does a SINGLE router.replace() to the correct
 * destination, eliminating the visible redirect chain that happened when the callback
 * went to /onboarding/setup → marketplace-profile → review-status.
 *
 * Flow:
 *   New pro (no record / ONBOARDING + account_setup_done=false) → /onboarding/setup
 *   ONBOARDING + account_setup_done=true                        → /onboarding/marketplace-profile
 *   PENDING_REVIEW / REJECTED / SUSPENDED                       → /pro/review-status
 *   ACTIVE                                                       → /pro/dashboard
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { IconLoader2 } from '@tabler/icons-react';

export default function ProAfterLoginPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.replace('/pro/login');
      return;
    }

    // Authenticated — fetch pro status and redirect once
    apiClient
      .getMyPro()
      .then((pro: any) => {
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
          router.replace('/onboarding/setup');
        } else if (!pro?.marketplace_profile_completed) {
          router.replace('/onboarding/marketplace-profile');
        } else {
          // Setup and marketplace profile done — final step is billing
          router.replace('/onboarding/billing');
        }
      })
      .catch(() => {
        // No pro record yet → brand new user, start onboarding
        router.replace('/onboarding/setup');
      });
  }, [router, sessionStatus]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <IconLoader2 className="mx-auto h-9 w-9 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm text-slate-500">Getting your account ready…</p>
      </div>
    </div>
  );
}
