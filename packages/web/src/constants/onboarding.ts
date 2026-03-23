export type OnboardingStepId =
  | 'profile'
  | 'company'
  | 'marketplace-profile'
  | 'knowledge'
  | 'calendar'
  | 'phone'
  | 'billing';

export const ONBOARDING_STEPS: Array<{
  id: OnboardingStepId;
  label: string;
  description: string;
}> = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Confirm your contact details.',
  },
  {
    id: 'company',
    label: 'Business basics',
    description: 'Name, trade, and business setup details.',
  },
  {
    id: 'marketplace-profile',
    label: 'Marketplace Profile',
    description: 'Build the public profile customers see first.',
  },
  {
    id: 'calendar',
    label: 'AI scheduling',
    description: 'Set business hours or connect your calendar.',
  },
  {
    id: 'phone',
    label: 'AI phone setup',
    description: 'Route calls to HandyCall with a demo or live number.',
  },
  {
    id: 'knowledge',
    label: 'AI knowledge',
    description: 'Teach the receptionist how your business works.',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Activate Starter or add billing for Pro/Max.',
  },
];
