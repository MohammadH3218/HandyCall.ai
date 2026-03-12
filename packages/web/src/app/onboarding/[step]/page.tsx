import { redirect } from 'next/navigation';

export default function LegacyOnboardingStepRedirect() {
  redirect('/onboarding/setup');
}
