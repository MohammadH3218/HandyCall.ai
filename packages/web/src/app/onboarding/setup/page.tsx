import { redirect } from 'next/navigation';

export default function LegacyOnboardingSetupRedirect() {
  redirect('/onboarding/account-setup');
}
