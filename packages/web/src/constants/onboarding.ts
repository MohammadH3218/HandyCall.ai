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
    id: 'calendar',
    label: 'AI scheduling',
    labelAr: 'جدولة الذكاء الاصطناعي',
    description: 'Set business hours or connect your calendar.',
    descriptionAr: 'حدد ساعات العمل أو اربط التقويم الخاص بك.',
  },
  {
    id: 'phone',
    label: 'AI phone setup',
    labelAr: 'إعداد هاتف الذكاء الاصطناعي',
    description: 'Route calls to HandyCall with a demo or live number.',
    descriptionAr: 'وجّه المكالمات إلى HandyCall برقم تجريبي أو مباشر.',
  },
  {
    id: 'knowledge',
    label: 'AI knowledge',
    labelAr: 'معرفة الذكاء الاصطناعي',
    description: 'Teach the receptionist how your business works.',
    descriptionAr: 'علّم موظف الاستقبال كيف يعمل نشاطك.',
  },
  {
    id: 'billing',
    label: 'Billing',
    labelAr: 'الفوترة',
    description: 'Activate Starter or add billing for Pro/Max.',
    descriptionAr: 'فعّل Starter أو أضف الفوترة لخطتي Pro و Max.',
  },
];
