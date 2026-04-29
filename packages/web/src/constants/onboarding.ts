export type OnboardingStepId =
  | 'profile'
  | 'company'
  | 'marketplace-profile'
  | 'billing';

export const ONBOARDING_STEPS: Array<{
  id: OnboardingStepId;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
}> = [
  {
    id: 'profile',
    label: 'Profile',
    labelAr: 'الملف الشخصي',
    description: 'Confirm your contact details.',
    descriptionAr: 'أكد بيانات التواصل الخاصة بك.',
  },
  {
    id: 'company',
    label: 'Business basics',
    labelAr: 'أساسيات النشاط',
    description: 'Name, trade, and business setup details.',
    descriptionAr: 'الاسم، المجال، وتفاصيل إعداد النشاط.',
  },
  {
    id: 'marketplace-profile',
    label: 'Marketplace Profile',
    labelAr: 'ملف السوق',
    description: 'Build the public profile customers see first.',
    descriptionAr: 'أنشئ الملف العام الذي يراه العملاء أولاً.',
  },
  {
    id: 'billing',
    label: 'Lead fees',
    labelAr: 'رسوم العملاء',
    description: 'Understand how lead fees work before you go live.',
    descriptionAr: 'تعرّف على كيفية عمل رسوم العملاء قبل البدء.',
  },
];
