'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { SAUDI_CITIES } from '@/constants/saudi-marketplace';
import {
  MARKETPLACE_SERVICE_CATEGORIES,
  getMarketplaceCategoryByTitle,
  getSpecificServicesForCategory,
} from '@/constants/marketplace-service-categories';

const PROPERTY_TYPES = ['Villa / House', 'Apartment', 'Townhouse', 'Office', 'Commercial / Warehouse', 'Government Building'];
const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'SAR' },
  { id: 'mada', label: 'Mada', icon: 'Mada' },
  { id: 'stc_pay', label: 'STC Pay', icon: 'STC' },
  { id: 'apple_pay', label: 'Apple Pay', icon: 'Apple' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'Card' },
  { id: 'bank_transfer', label: 'Bank Transfer (IBAN)', icon: 'IBAN' },
];
const EMPLOYEE_OPTIONS = ['Just me (solo)', '2-5 employees', '6-20 employees', '20+ employees'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];

const EDITOR_TRANSLATIONS: Record<string, string> = {
  'Villa / House': 'فيلا / منزل',
  Apartment: 'شقة',
  Townhouse: 'تاون هاوس',
  Office: 'مكتب',
  'Commercial / Warehouse': 'تجاري / مستودع',
  'Government Building': 'مبنى حكومي',
  Cash: 'نقدًا',
  Mada: 'مدى',
  'STC Pay': 'STC Pay',
  'Apple Pay': 'Apple Pay',
  'Credit / Debit Card': 'بطاقة ائتمانية / بطاقة مدى',
  'Bank Transfer (IBAN)': 'حوالة بنكية (IBAN)',
  'Just me (solo)': 'أنا فقط',
  '2-5 employees': '2-5 موظفين',
  '6-20 employees': '6-20 موظفًا',
  '20+ employees': '20+ موظفًا',
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
  'Something went wrong. Please try again.': 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
  'Marketplace profile': 'ملف السوق',
  'Complete your marketplace profile': 'أكمل ملفك في السوق',
  'Customers browse this profile before deciding to contact you. Keep it complete, specific, and trustworthy.':
    'يتصفح العملاء هذا الملف قبل أن يقرروا التواصل معك. حافظ عليه كاملًا وواضحًا ويبعث على الثقة.',
  'This is the first setup milestone for your': 'هذه هي أول محطة إعداد لباقة',
  selected: 'المحددة',
  tier: 'الخاصة بك',
  "Finish your marketplace profile first, then we'll bring you back to the rest of the setup flow.":
    'أكمل ملفك في السوق أولًا، ثم سنعيدك إلى بقية خطوات الإعداد.',
  'About your business': 'نبذة عن نشاطك',
  'Tell customers who you are and why they should hire you.': 'عرّف العملاء بك ولماذا ينبغي عليهم اختيارك.',
  'Business bio *': 'نبذة النشاط *',
  'Licensed AC technician with 12 years of experience in Riyadh. We service villas, apartments, and commercial sites with same-day appointments.':
    'فني تكييف معتمد بخبرة 12 سنة في الرياض. نخدم الفلل والشقق والمواقع التجارية مع مواعيد في نفس اليوم.',
  Overview: 'نظرة عامة',
  'Key facts that appear on your profile card.': 'معلومات أساسية تظهر في بطاقة ملفك.',
  'Years in business': 'سنوات الخبرة',
  'e.g. 8': 'مثال: 8',
  'Number of employees': 'عدد الموظفين',
  'Select...': 'اختر...',
  'I am licensed / certified in my trade': 'أنا مرخص / معتمد في مجالي',
  'I agree to identity & background verification': 'أوافق على التحقق من الهوية والخلفية',
  Credentials: 'الاعتمادات',
  'License details appear as a trust badge on your public profile.':
    'تظهر تفاصيل الترخيص كشارة ثقة في ملفك العام.',
  'License type': 'نوع الترخيص',
  'e.g. Electrician - Master': 'مثال: كهربائي - معلم',
  'License / certificate number': 'رقم الترخيص / الشهادة',
  Optional: 'اختياري',
  'Services offered': 'الخدمات المقدمة',
  'Choose your main category, then list the exact jobs customers should be able to find you for.':
    'اختر الفئة الرئيسية، ثم حدد الأعمال الدقيقة التي يجب أن يتمكن العملاء من العثور عليك من خلالها.',
  'Main category': 'الفئة الرئيسية',
  'Select category...': 'اختر الفئة...',
  'Help search understand what you do': 'ساعد البحث على فهم ما تقدمه',
  'Add the exact services customers would type into search, not just the broad category name.':
    'أضف الخدمات الدقيقة التي قد يكتبها العملاء في البحث، وليس اسم الفئة العامة فقط.',
  'Suggested examples:': 'أمثلة مقترحة:',
  'Specific services customers can search for': 'الخدمات الدقيقة التي يمكن للعملاء البحث عنها',
  'Pick a category first, then add the exact services you offer below.':
    'اختر الفئة أولًا، ثم أضف الخدمات الدقيقة التي تقدمها في الأسفل.',
  'Add a custom specific service': 'أضف خدمة دقيقة مخصصة',
  'Example:': 'مثال:',
  'Add service': 'إضافة خدمة',
  'Be specific. Customers may search exact phrases like “mesh Wi-Fi setup” or “water heater repair.”':
    'كن دقيقًا. قد يبحث العملاء بعبارات محددة مثل "إعداد شبكة Mesh Wi‑Fi" أو "إصلاح سخان المياه".',
  'Property types served': 'أنواع العقارات التي تخدمها',
  'Cities you serve': 'المدن التي تخدمها',
  'Customers search by city, so choose all areas you actively cover.':
    'يبحث العملاء حسب المدينة، لذا اختر جميع المناطق التي تغطيها فعليًا.',
  'Starting price': 'السعر الابتدائي',
  'This sets customer expectations before they message you.':
    'هذا يحدد توقعات العميل قبل أن يراسلك.',
  'From SAR': 'ابتداءً من',
  'e.g. 150': 'مثال: 150',
  '/ service': '/ خدمة',
  'Business hours': 'ساعات العمل',
  'Saudi work week defaults to Sun-Thu. Update anything that differs.':
    'أسبوع العمل السعودي الافتراضي من الأحد إلى الخميس. عدل أي شيء مختلف.',
  Day: 'اليوم',
  Open: 'مفتوح',
  From: 'من',
  To: 'إلى',
  weekend: 'عطلة نهاية الأسبوع',
  'Payment methods': 'وسائل الدفع',
  'Tell customers how they can pay you once the job is booked.':
    'أخبر العملاء كيف يمكنهم الدفع لك بعد حجز الخدمة.',
  'Social media & website': 'وسائل التواصل والموقع الإلكتروني',
  'Links shown on your profile so customers can see your work online.':
    'روابط تظهر في ملفك حتى يتمكن العملاء من مشاهدة أعمالك عبر الإنترنت.',
  'Instagram username': 'اسم مستخدم إنستغرام',
  'Snapchat username': 'اسم مستخدم سناب شات',
  'Twitter / X username': 'اسم مستخدم X / تويتر',
  'Website URL': 'رابط الموقع الإلكتروني',
  yourhandle: 'اسمك',
  'https://yoursite.com': 'https://example.com',
  'Projects & work photos': 'المشاريع وصور الأعمال',
  'Photos improve trust and increase inquiry rates.': 'الصور تعزز الثقة وتزيد من معدل الاستفسارات.',
  'Upload photos of your work': 'ارفع صورًا من أعمالك',
  'Up to 10 photos · JPG, PNG · Max 5MB each': 'حتى 10 صور · JPG و PNG · بحد أقصى 5MB للصورة',
  'Add photos': 'إضافة صور',
  'Photo upload will be available once your account is fully set up. You can add photos from your dashboard settings.':
    'سيصبح رفع الصور متاحًا بعد اكتمال إعداد حسابك. يمكنك إضافة الصور من إعدادات لوحة التحكم.',
  'Describe your recent projects (optional)': 'صف مشاريعك الأخيرة (اختياري)',
  'Installed 200+ AC units across Riyadh in 2025. Specialise in commercial buildings and villas.':
    'تم تركيب أكثر من 200 وحدة تكييف في الرياض خلال 2025. متخصصون في المباني التجارية والفلل.',
  'Marketplace profile updated successfully.': 'تم تحديث ملف السوق بنجاح.',
  'Profile saved! Taking you back to setup...': 'تم حفظ الملف. جارٍ إعادتك إلى الإعداد...',
  'Profile saved! Taking you to your dashboard...': 'تم حفظ الملف. جارٍ نقلك إلى لوحة التحكم...',
  'Saving profile...': 'جارٍ حفظ الملف...',
  'Save marketplace profile': 'حفظ ملف السوق',
  'Save profile & continue setup ->': 'حفظ الملف ومتابعة الإعداد <-',
  'Save profile & go to dashboard ->': 'حفظ الملف والانتقال إلى لوحة التحكم <-',
  'Back to marketplace': 'العودة إلى السوق',
  'Back to setup': 'العودة إلى الإعداد',
  'Finish later': 'إكمال لاحقًا',
  'You can update your marketplace profile anytime from Dashboard -> Marketplace -> Profile':
    'يمكنك تحديث ملف السوق في أي وقت من لوحة التحكم -> السوق -> الملف الشخصي',
};

function editorText(text: string, isArabic: boolean) {
  return isArabic ? EDITOR_TRANSLATIONS[text] || text : text;
}

interface BusinessHourEntry {
  open: boolean;
  from: string;
  to: string;
}

type BusinessHoursMap = Record<string, BusinessHourEntry>;

interface MarketplaceProfile {
  bio: string;
  years_in_business: string;
  employees: string;
  license_type: string;
  license_number: string;
  is_licensed: boolean;
  is_background_checked: boolean;
  service_category: string;
  services_offered: string[];
  property_types: string[];
  payment_methods: string[];
  instagram: string;
  snapchat: string;
  twitter: string;
  website: string;
  starting_price: string;
  service_cities: string[];
  business_hours: BusinessHoursMap;
  portfolio_note: string;
}

const defaultHours: BusinessHoursMap = {
  Sunday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Monday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Tuesday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Wednesday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Thursday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Friday: { open: false, from: '12:00 PM', to: '6:00 PM' },
  Saturday: { open: false, from: '8:00 AM', to: '6:00 PM' },
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';
const sectionClass = 'rounded-2xl border border-slate-100 bg-white p-6 shadow-sm';
const sectionTitleClass = 'mb-1 text-base font-bold text-slate-900';
const sectionSubClass = 'mb-5 text-xs text-slate-400';

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item];
}

export function MarketplaceProfileEditor({
  mode,
  returnToSetup = false,
  selectedTier,
}: {
  mode: 'onboarding' | 'dashboard';
  returnToSetup?: boolean;
  selectedTier?: string | null;
}) {
  const router = useRouter();
  const { company } = useAuthStore();
  const { isArabic } = useMarketingLanguage();
  const t = (text: string) => editorText(text, isArabic);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [customServiceInput, setCustomServiceInput] = useState('');

  const existingProfile = ((company as any)?.marketplace_profile || {}) as Partial<MarketplaceProfile>;
  const existingCities =
    Array.isArray((company as any)?.service_area_cities) && (company as any)?.service_area_cities.length > 0
      ? ((company as any)?.service_area_cities as string[])
      : [];

  const [profile, setProfile] = useState<MarketplaceProfile>({
    bio: existingProfile.bio || '',
    years_in_business: existingProfile.years_in_business || '',
    employees: existingProfile.employees || '',
    license_type: existingProfile.license_type || '',
    license_number: existingProfile.license_number || '',
    is_licensed: Boolean(existingProfile.is_licensed),
    is_background_checked: Boolean(existingProfile.is_background_checked),
    service_category: existingProfile.service_category || (company as any)?.service_type || '',
    services_offered: Array.isArray(existingProfile.services_offered) ? existingProfile.services_offered : [],
    property_types: Array.isArray(existingProfile.property_types) ? existingProfile.property_types : [],
    payment_methods:
      Array.isArray(existingProfile.payment_methods) && existingProfile.payment_methods.length > 0
        ? existingProfile.payment_methods
        : ['cash'],
    instagram: existingProfile.instagram || '',
    snapchat: existingProfile.snapchat || '',
    twitter: existingProfile.twitter || '',
    website: existingProfile.website || '',
    starting_price: existingProfile.starting_price || '',
    service_cities:
      Array.isArray(existingProfile.service_cities) && existingProfile.service_cities.length > 0
        ? existingProfile.service_cities
        : existingCities,
    business_hours: existingProfile.business_hours || defaultHours,
    portfolio_note: existingProfile.portfolio_note || '',
  });

  const selectedCategory = getMarketplaceCategoryByTitle(profile.service_category);
  const serviceSubtypes = getSpecificServicesForCategory(profile.service_category);

  function addCustomService() {
    const nextService = customServiceInput.trim();
    if (!nextService) return;
    const alreadyIncluded = profile.services_offered.some(
      (service) => service.toLowerCase() === nextService.toLowerCase()
    );
    if (alreadyIncluded) {
      setCustomServiceInput('');
      return;
    }
    setProfile((current) => ({
      ...current,
      services_offered: [...current.services_offered, nextService],
    }));
    setCustomServiceInput('');
  }

  function updateHours(day: string, field: keyof BusinessHourEntry, value: string | boolean) {
    setProfile((current) => ({
      ...current,
      business_hours: {
        ...current.business_hours,
        [day]: { ...current.business_hours[day], [field]: value },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await apiClient.updateMyCompany({
        marketplace_profile: profile,
        service_area_cities: profile.service_cities,
        service_area_completed: profile.service_cities.length > 0,
        marketplace_profile_completed: true,
      } as any);
      setSaved(true);
      if (mode === 'dashboard') return;
      setTimeout(() => {
        router.replace(returnToSetup ? '/onboarding/setup?marketplace=done' : '/dashboard');
      }, 1200);
    } catch (e: any) {
      setError(e.message || t('Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {mode === 'dashboard' ? t('Marketplace profile') : t('Complete your marketplace profile')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            'Customers browse this profile before deciding to contact you. Keep it complete, specific, and trustworthy.'
          )}
        </p>
        {returnToSetup ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">
              {t('This is the first setup milestone for your')} {selectedTier || t('selected')} {t('tier')}.
            </p>
            <p className="mt-1 text-emerald-800/80">
              {t("Finish your marketplace profile first, then we'll bring you back to the rest of the setup flow.")}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('About your business')}</h2>
          <p className={sectionSubClass}>{t('Tell customers who you are and why they should hire you.')}</p>
          <label className={labelClass}>{t('Business bio *')}</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            maxLength={500}
            placeholder={t(
              'Licensed AC technician with 12 years of experience in Riyadh. We service villas, apartments, and commercial sites with same-day appointments.'
            )}
            className={`${inputClass} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{profile.bio.length} / 500</p>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Overview')}</h2>
          <p className={sectionSubClass}>{t('Key facts that appear on your profile card.')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('Years in business')}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={profile.years_in_business}
                onChange={(e) => setProfile({ ...profile, years_in_business: e.target.value })}
                placeholder={t('e.g. 8')}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Number of employees')}</label>
              <select
                value={profile.employees}
                onChange={(e) => setProfile({ ...profile, employees: e.target.value })}
                className={inputClass}
              >
                <option value="">{t('Select...')}</option>
                {EMPLOYEE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={profile.is_licensed}
                onChange={(e) => setProfile({ ...profile, is_licensed: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              <span className="text-sm font-medium text-slate-700">{t('I am licensed / certified in my trade')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={profile.is_background_checked}
                onChange={(e) => setProfile({ ...profile, is_background_checked: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              <span className="text-sm font-medium text-slate-700">{t('I agree to identity & background verification')}</span>
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Credentials')}</h2>
          <p className={sectionSubClass}>{t('License details appear as a trust badge on your public profile.')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('License type')}</label>
              <input
                type="text"
                value={profile.license_type}
                onChange={(e) => setProfile({ ...profile, license_type: e.target.value })}
                placeholder={t('e.g. Electrician - Master')}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('License / certificate number')}</label>
              <input
                type="text"
                value={profile.license_number}
                onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                placeholder={t('Optional')}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Services offered')}</h2>
          <p className={sectionSubClass}>
            {t(
              'Choose your main category, then list the exact jobs customers should be able to find you for.'
            )}
          </p>
          <label className={labelClass}>{t('Main category')}</label>
          <select
            value={profile.service_category}
            onChange={(e) =>
              setProfile({ ...profile, service_category: e.target.value, services_offered: [] })
            }
            className={`${inputClass} mb-4`}
          >
            <option value="">{t('Select category...')}</option>
            {MARKETPLACE_SERVICE_CATEGORIES.map((category) => (
              <option key={category.key} value={category.title}>
                {isArabic ? category.titleAr : category.title}
              </option>
            ))}
          </select>

          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">{t('Help search understand what you do')}</p>
            <p className="mt-1 text-emerald-800/80">
              {isArabic
                ? t('Add the exact services customers would type into search, not just the broad category name.')
                : selectedCategory?.setupGuidance ||
                  'Add the exact services customers would type into search, not just the broad category name.'}
            </p>
            {selectedCategory ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-700/90">
                {t('Suggested examples:')} {selectedCategory.services.slice(0, 4).join(isArabic ? '، ' : ', ')}
              </p>
            ) : null}
          </div>

          <label className={labelClass}>{t('Specific services customers can search for')}</label>
          {serviceSubtypes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {serviceSubtypes.map((service) => (
                <label
                  key={service}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <input
                    type="checkbox"
                    checked={profile.services_offered.includes(service)}
                    onChange={() =>
                      setProfile({ ...profile, services_offered: toggle(profile.services_offered, service) })
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-slate-700">{service}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
              {t('Pick a category first, then add the exact services you offer below.')}
            </div>
          )}

          <div className="mt-4">
            <label className={labelClass}>{t('Add a custom specific service')}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={customServiceInput}
                onChange={(e) => setCustomServiceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                placeholder={
                  selectedCategory
                    ? `${t('Example:')} ${selectedCategory.services.slice(0, 1)[0] || 'Mesh network setup'}`
                    : isArabic
                      ? 'مثال: إعداد شبكة Mesh، تمديد إيثرنت، إعداد الستالايت'
                      : 'Example: Mesh network setup, ethernet cabling, satellite setup'
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomService}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {t('Add service')}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t(
                'Be specific. Customers may search exact phrases like “mesh Wi-Fi setup” or “water heater repair.”'
              )}
            </p>
          </div>

          {profile.services_offered.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.services_offered.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, services_offered: profile.services_offered.filter((item) => item !== service) })
                  }
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300"
                >
                  {service} ×
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <label className={labelClass}>{t('Property types served')}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROPERTY_TYPES.map((propertyType) => (
                <label
                  key={propertyType}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <input
                    type="checkbox"
                    checked={profile.property_types.includes(propertyType)}
                    onChange={() =>
                      setProfile({ ...profile, property_types: toggle(profile.property_types, propertyType) })
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-slate-700">{t(propertyType)}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Cities you serve')}</h2>
          <p className={sectionSubClass}>{t('Customers search by city, so choose all areas you actively cover.')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SAUDI_CITIES.map((city) => (
              <label
                key={city}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <input
                  type="checkbox"
                  checked={profile.service_cities.includes(city)}
                  onChange={() =>
                    setProfile({ ...profile, service_cities: toggle(profile.service_cities, city) })
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-xs font-medium text-slate-700">{city}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Starting price')}</h2>
          <p className={sectionSubClass}>{t('This sets customer expectations before they message you.')}</p>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-sm font-semibold text-slate-500">{t('From SAR')}</span>
            <input
              type="number"
              min={0}
              value={profile.starting_price}
              onChange={(e) => setProfile({ ...profile, starting_price: e.target.value })}
              placeholder={t('e.g. 150')}
              className={`${inputClass} max-w-xs`}
            />
            <span className="text-sm text-slate-400">{t('/ service')}</span>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Business hours')}</h2>
          <p className={sectionSubClass}>{t('Saudi work week defaults to Sun-Thu. Update anything that differs.')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-28 pb-2 text-left text-xs font-semibold text-slate-400">{t('Day')}</th>
                  <th className="w-20 pb-2 text-left text-xs font-semibold text-slate-400">{t('Open')}</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-400">{t('From')}</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-400">{t('To')}</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const hours = profile.business_hours[day];
                  const isWeekend = day === 'Friday' || day === 'Saturday';
                  return (
                    <tr key={day} className="border-b border-slate-50 last:border-none">
                      <td className="py-2.5 pr-4">
                        <span className={`text-sm font-medium ${isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                          {t(day)}
                          {isWeekend ? <span className="ml-1 text-xs text-slate-300">({t('weekend')})</span> : null}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <input
                          type="checkbox"
                          checked={hours.open}
                          onChange={(e) => updateHours(day, 'open', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <select
                          disabled={!hours.open}
                          value={hours.from}
                          onChange={(e) => updateHours(day, 'from', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                        >
                          {TIMES.map((time) => (
                            <option key={time}>{time}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5">
                        <select
                          disabled={!hours.open}
                          value={hours.to}
                          onChange={(e) => updateHours(day, 'to', e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                        >
                          {TIMES.map((time) => (
                            <option key={time}>{time}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Payment methods')}</h2>
          <p className={sectionSubClass}>{t('Tell customers how they can pay you once the job is booked.')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((paymentMethod) => (
              <label
                key={paymentMethod.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${
                  profile.payment_methods.includes(paymentMethod.id)
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-100 hover:border-emerald-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={profile.payment_methods.includes(paymentMethod.id)}
                  onChange={() =>
                    setProfile({
                      ...profile,
                      payment_methods: toggle(profile.payment_methods, paymentMethod.id),
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-xs font-semibold text-slate-700">{paymentMethod.icon}</span>
                <span className="text-xs font-semibold text-slate-700">{t(paymentMethod.label)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Social media & website')}</h2>
          <p className={sectionSubClass}>{t('Links shown on your profile so customers can see your work online.')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('Instagram username')}</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                <span className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">@</span>
                <input
                  type="text"
                  value={profile.instagram}
                  onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                  placeholder={t('yourhandle')}
                  className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('Snapchat username')}</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                <span className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">@</span>
                <input
                  type="text"
                  value={profile.snapchat}
                  onChange={(e) => setProfile({ ...profile, snapchat: e.target.value })}
                  placeholder={t('yourhandle')}
                  className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('Twitter / X username')}</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                <span className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">@</span>
                <input
                  type="text"
                  value={profile.twitter}
                  onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                  placeholder={t('yourhandle')}
                  className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('Website URL')}</label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder={t('https://yoursite.com')}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Projects & work photos')}</h2>
          <p className={sectionSubClass}>{t('Photos improve trust and increase inquiry rates.')}</p>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-300">
            <div className="mb-3 text-4xl">📷</div>
            <p className="text-sm font-semibold text-slate-700">{t('Upload photos of your work')}</p>
            <p className="mt-1 text-xs text-slate-400">{t('Up to 10 photos · JPG, PNG · Max 5MB each')}</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              onClick={() =>
                window.alert(
                  t(
                    'Photo upload will be available once your account is fully set up. You can add photos from your dashboard settings.'
                  )
                )
              }
            >
              {t('Add photos')}
            </button>
          </div>
          <div className="mt-4">
            <label className={labelClass}>{t('Describe your recent projects (optional)')}</label>
            <textarea
              value={profile.portfolio_note}
              onChange={(e) => setProfile({ ...profile, portfolio_note: e.target.value })}
              rows={3}
              maxLength={300}
              placeholder={t(
                'Installed 200+ AC units across Riyadh in 2025. Specialise in commercial buildings and villas.'
              )}
              className={`${inputClass} resize-none`}
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
            <div className="text-4xl">✅</div>
            <p className="text-base font-bold text-emerald-800">
              {mode === 'dashboard'
                ? t('Marketplace profile updated successfully.')
                : returnToSetup
                  ? t('Profile saved! Taking you back to setup...')
                  : t('Profile saved! Taking you to your dashboard...')}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving
              ? t('Saving profile...')
              : mode === 'dashboard'
                ? t('Save marketplace profile')
                : returnToSetup
                  ? t('Save profile & continue setup ->')
                  : t('Save profile & go to dashboard ->')}
          </button>
          <button
            onClick={() =>
              router.replace(
                mode === 'dashboard'
                  ? '/dashboard/marketplace/requests'
                  : returnToSetup
                    ? '/onboarding/setup'
                    : '/dashboard'
              )
            }
            className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {mode === 'dashboard'
              ? t('Back to marketplace')
              : returnToSetup
                ? t('Back to setup')
                : t('Finish later')}
          </button>
        </div>

        <p className="pb-4 text-center text-xs text-slate-400">
          {t('You can update your marketplace profile anytime from Dashboard -> Marketplace -> Profile')}
        </p>
      </div>
    </div>
  );
}
