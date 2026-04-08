'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { optimizeImageFile } from '@/lib/image-upload';
import { useAuthStore } from '@/stores/auth-store';
import { useMarketingLanguage } from '@/components/providers/marketing-language-provider';
import { HOUSTON_CITIES } from '@/constants/houston-marketplace';
import {
  MARKETPLACE_SERVICE_CATEGORIES,
  getMarketplaceCategoryByTitle,
  getSpecificServicesForCategory,
} from '@/constants/marketplace-service-categories';

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Office', 'Commercial / Warehouse', 'Government Building'];
const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="2" y="6" width="20" height="12" rx="2" className="text-emerald-600" stroke="currentColor" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" />
      <path d="M6 10v4M18 10v4" strokeLinecap="round" />
    </svg>
  ),
  apple_pay: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" strokeLinecap="round" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  ),
  zelle: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 13.5h-5.83l5.58-7H8.5v-2h7.83L10.75 13.5H16.5v2z" style={{fill:'#6d1ed4'}}/>
    </svg>
  ),
  venmo: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.74 5c.26.43.38.88.38 1.46 0 1.82-1.55 4.19-2.82 5.85L11.2 17h-2.7l-1.07-8.93 2.36-.23.57 4.58c.53-.86 1.19-2.22 1.19-3.14 0-.51-.09-.85-.23-1.14L13.2 7h1.54z" style={{fill:'#3d95ce'}}/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M3 10h18" />
      <path d="M7 14h4M7 17h3" strokeLinecap="round" />
    </svg>
  ),
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'apple_pay', label: 'Apple Pay' },
  { id: 'card', label: 'Credit / Debit Card' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'venmo', label: 'Venmo' },
  { id: 'check', label: 'Check' },
];
const EMPLOYEE_OPTIONS = ['Just me (solo)', '2-5 employees', '6-20 employees', '20+ employees'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];

const EDITOR_TRANSLATIONS: Record<string, string> = {
  'House': 'منزل',
  Apartment: 'شقة',
  Townhouse: 'تاون هاوس',
  Office: 'مكتب',
  'Commercial / Warehouse': 'تجاري / مستودع',
  'Government Building': 'مبنى حكومي',
  Cash: 'نقدًا',
  'Apple Pay': 'Apple Pay',
  'Credit / Debit Card': 'بطاقة ائتمانية / خصم',
  Zelle: 'Zelle',
  Venmo: 'Venmo',
  Check: 'Check',
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
  'Profile photo': 'صورة الملف الشخصي',
  'A clear photo of you or your team builds trust with customers. Required to publish your profile.':
    'صورة واضحة لك أو لفريقك تبني الثقة مع العملاء. مطلوبة لنشر ملفك.',
  'Change photo': 'تغيير الصورة',
  'Upload photo': 'رفع صورة',
  'JPG or PNG · Max 5MB': 'JPG أو PNG · بحد أقصى 5MB',
  Required: 'مطلوب',
  'Please upload a profile photo before saving.': 'يرجى رفع صورة شخصية قبل الحفظ.',
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
  'Licensed AC technician with 12 years of experience in Houston. We service homes, apartments, and commercial sites with same-day appointments.':
    'فني تكييف معتمد بخبرة 12 سنة في هيوستن. نخدم المنازل والشقق والمواقع التجارية مع مواعيد في نفس اليوم.',
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
  'From $': 'ابتداءً من',
  'e.g. 150': 'مثال: 150',
  '/ service': '/ خدمة',
  'Business hours': 'ساعات العمل',
  'Standard work week is Mon-Fri. Update anything that differs.':
    'أسبوع العمل الافتراضي من الاثنين إلى الجمعة. عدل أي شيء مختلف.',
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
  'Installed 200+ AC units across Houston in 2025. Specialise in commercial buildings and homes.':
    'تم تركيب أكثر من 200 وحدة تكييف في هيوستن خلال 2025. متخصصون في المباني التجارية والمنازل.',
  'Marketplace profile updated successfully.': 'تم تحديث ملف السوق بنجاح.',
  'Profile saved! Taking you back to setup...': 'تم حفظ الملف. جارٍ إعادتك إلى الإعداد...',
  'Profile saved! Taking you to your dashboard...': 'تم حفظ الملف. جارٍ نقلك إلى لوحة التحكم...',
  'Saving profile...': 'جارٍ حفظ الملف...',
  'Detailed services win better leads': 'الخدمات المفصلة تجلب فرصًا أفضل',
  'Customers compare pros based on specialties, exact job types, and the clarity of the services listed. The more detailed you are, the better your leads tend to be.':
    'يقارن العملاء بين المحترفين بحسب التخصصات ونوع الأعمال الدقيقة ووضوح الخدمات المدرجة. كلما كنت أكثر تفصيلًا، كانت الفرص الواردة إليك أفضل عادةً.',
  'Add at least 3 specific services before saving.':
    'أضف 3 خدمات دقيقة على الأقل قبل الحفظ.',
  'Add more detail to your business bio before saving.':
    'أضف تفاصيل أكثر إلى نبذة نشاطك قبل الحفظ.',
  'Save marketplace profile': 'حفظ ملف السوق',
  'Save profile & continue setup ->': 'حفظ الملف ومتابعة الإعداد <-',
  'Save profile & go to dashboard ->': 'حفظ الملف والانتقال إلى لوحة التحكم <-',
  'Back to marketplace': 'العودة إلى السوق',
  'Back to setup': 'العودة إلى الإعداد',
  'Finish later': 'إكمال لاحقًا',
  'You can update your marketplace profile anytime from Dashboard -> Marketplace -> Profile':
    'يمكنك تحديث ملف السوق في أي وقت من لوحة التحكم -> السوق -> الملف الشخصي',
  // Identity & verification section
  'Verification & identity': 'التحقق والهوية',
  'We use this to verify who you are and ensure customers can trust the pros on HandyCall. Your ID number is kept private and never shown publicly.':
    'نستخدم هذه المعلومات للتحقق من هويتك وضمان ثقة العملاء بالمحترفين على HandyCall. رقم هويتك يبقى خاصًا ولن يُعرض للعامة.',
  'I am registering as:': 'أسجّل بوصفي:',
  'Solo / Freelancer': 'فرد / مستقل',
  'Work under your own name': 'العمل باسمك الشخصي',
  Company: 'شركة',
  'Registered business or team': 'شركة مسجلة أو فريق',
  'Government-issued ID *': 'هوية حكومية *',
  "Driver's license or ID number": 'رقم رخصة القيادة أو الهوية',
  'Mobile number *': 'رقم الجوال *',
  'Mobile number': 'رقم الجوال',
  'National address': 'العنوان الوطني',
  'Your registered national address (optional)': 'عنوانك الوطني المسجّل (اختياري)',
  'Company legal name *': 'الاسم القانوني للشركة *',
  'As it appears on your commercial registration': 'كما يظهر في السجل التجاري',
  'Commercial Registration (CR) number *': 'رقم السجل التجاري *',
  'Business license number': 'رقم الترخيص التجاري',
  'EIN (Employer ID)': 'EIN (رقم صاحب العمل)',
  'EIN number (optional)': 'رقم EIN (اختياري)',
  'Company address': 'عنوان الشركة',
  'City, district, street': 'المدينة، الحي، الشارع',
  'I confirm this information is accurate and I consent to identity verification as part of joining HandyCall as a Pro.':
    'أؤكد أن هذه المعلومات دقيقة، وأوافق على التحقق من الهوية كجزء من انضمامي إلى HandyCall بوصفي محترفًا.',
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
  // Identity & verification
  account_type: 'individual' | 'company' | '';
  id_number: string;
  phone_number: string;
  home_address_street: string;
  home_address_city: string;
  home_address_state: string;
  home_address_zip: string;
  // Company-only
  company_name_legal: string;
  cr_number: string;
  vat_number: string;
  company_address: string;
  // Profile
  profile_photo: string;
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
  contact_for_price: boolean;
  service_cities: string[];
  business_hours: BusinessHoursMap;
  portfolio_note: string;
  portfolio_photos: string[];
}

const defaultHours: BusinessHoursMap = {
  Monday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Tuesday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Wednesday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Thursday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Friday: { open: true, from: '8:00 AM', to: '6:00 PM' },
  Saturday: { open: false, from: '8:00 AM', to: '6:00 PM' },
  Sunday: { open: false, from: '8:00 AM', to: '6:00 PM' },
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

function CitySearch({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? HOUSTON_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()) && !selected.includes(c))
    : HOUSTON_CITIES.filter((c) => !selected.includes(c));

  const add = (city: string) => {
    onChange([...selected, city]);
    setQuery('');
  };

  const remove = (city: string) => onChange(selected.filter((c) => c !== city));

  // Close on outside click
  useState(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  });

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((city) => (
            <span key={city} className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
              {city}
              <button type="button" onClick={() => remove(city)} className="text-emerald-400 hover:text-emerald-700 leading-none">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search Houston neighborhoods & cities…"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.map((city) => (
              <button
                key={city}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(city); }}
                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {city}
              </button>
            ))}
          </div>
        )}
        {open && filtered.length === 0 && query.trim() && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-lg">
            No matching areas found.
          </div>
        )}
      </div>
    </div>
  );
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
  const { company, setCompany } = useAuthStore();
  const { isArabic } = useMarketingLanguage();
  const t = (text: string) => editorText(text, isArabic);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [customServiceInput, setCustomServiceInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const existingProfile = ((company as any)?.marketplace_profile || {}) as Partial<MarketplaceProfile>;
  const existingCities =
    Array.isArray((company as any)?.service_area_cities) && (company as any)?.service_area_cities.length > 0
      ? ((company as any)?.service_area_cities as string[])
      : [];

  const [profile, setProfile] = useState<MarketplaceProfile>({
    account_type: (existingProfile.account_type as any) || '',
    id_number: existingProfile.id_number || '',
    phone_number: existingProfile.phone_number || '',
    home_address_street: existingProfile.home_address_street || '',
    home_address_city: existingProfile.home_address_city || '',
    home_address_state: existingProfile.home_address_state || '',
    home_address_zip: existingProfile.home_address_zip || '',
    company_name_legal: existingProfile.company_name_legal || '',
    cr_number: existingProfile.cr_number || '',
    vat_number: existingProfile.vat_number || '',
    company_address: existingProfile.company_address || '',
    profile_photo: existingProfile.profile_photo || '',
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
    contact_for_price: Boolean(existingProfile.contact_for_price),
    service_cities:
      Array.isArray(existingProfile.service_cities) && existingProfile.service_cities.length > 0
        ? existingProfile.service_cities
        : existingCities,
    business_hours: existingProfile.business_hours || defaultHours,
    portfolio_note: existingProfile.portfolio_note || '',
    portfolio_photos: Array.isArray(existingProfile.portfolio_photos) ? existingProfile.portfolio_photos : [],
  });

  const selectedCategory = getMarketplaceCategoryByTitle(profile.service_category);
  const serviceSubtypes = getSpecificServicesForCategory(profile.service_category);

  function addCustomService() {
    const nextService = customServiceInput.trim();
    if (!nextService) return;
    if (profile.services_offered.length >= 10) return;
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

  async function handlePhotoFiles(files: FileList) {
    const remaining = 10 - profile.portfolio_photos.length;
    if (remaining <= 0) return;
    setPhotoUploading(true);
    try {
      const selected = Array.from(files).slice(0, remaining);
      const compressed = await Promise.all(
        selected.map(async (file) => (await optimizeImageFile(file, { maxLongEdge: 1800, quality: 0.9 })).url)
      );
      setProfile((current) => ({
        ...current,
        portfolio_photos: [...current.portfolio_photos, ...compressed],
      }));
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(index: number) {
    setProfile((current) => ({
      ...current,
      portfolio_photos: current.portfolio_photos.filter((_, i) => i !== index),
    }));
  }

  function movePhoto(index: number, direction: 'up' | 'down') {
    setProfile((current) => {
      const photos = [...current.portfolio_photos];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= photos.length) return current;
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...current, portfolio_photos: photos };
    });
  }

  async function handleProfilePhotoFile(file: File) {
    setProfilePhotoUploading(true);
    try {
      const optimized = await optimizeImageFile(file, { maxLongEdge: 960, quality: 0.9 });
      setProfile((prev) => ({ ...prev, profile_photo: optimized.url }));
    } catch {
      // ignore
    } finally {
      setProfilePhotoUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    if (!profile.profile_photo) {
      setError('Please upload a profile photo before saving.');
      setSaving(false);
      return;
    }
    if (!profile.service_category) {
      setError(t('Pick a category first, then add the exact services you offer below.'));
      setSaving(false);
      return;
    }
    if (profile.services_offered.length < 3) {
      setError(t('Add at least 3 specific services before saving.'));
      setSaving(false);
      return;
    }
    if (profile.bio.trim().length < 80) {
      setError(t('Add more detail to your business bio before saving.'));
      setSaving(false);
      return;
    }
    try {
      // Step 1: Save all profile data WITHOUT photos (always small, always succeeds)
      const profileWithoutPhotos = { ...profile, portfolio_photos: [] };
      await apiClient.updateMyCompany({
        marketplace_profile: profileWithoutPhotos,
        service_area_cities: profile.service_cities,
        service_area_completed: profile.service_cities.length > 0,
        marketplace_profile_completed: true,
        public_profile_enabled: true,
      } as any);

      // Step 2: Save photos separately — if this fails, profile is still saved
      if (profile.portfolio_photos.length > 0) {
        try {
          await apiClient.updateMyCompany({
            marketplace_profile: { ...profile },
          } as any);
        } catch {
          // Photos too large for a single request — profile saved without them.
          // Silently ignore so the user can still proceed.
        }
      }

      // Refresh auth store so status checks see the updated data immediately
      try {
        const fresh = await apiClient.getMyCompany();
        if (fresh && company) {
          setCompany({ ...company, ...fresh } as any);
        }
      } catch {
        // Non-critical — proceed even if refresh fails
      }

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
        {/* ── Profile photo ──────────────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>
            {t('Profile photo')} <span className="text-red-500">*</span>
          </h2>
          <p className={sectionSubClass}>
            {t('A clear photo of you or your team builds trust with customers. Required to publish your profile.')}
          </p>
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="Profile"
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-emerald-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-3xl font-bold text-slate-300">
                  {(profile.bio || company?.company_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              {profilePhotoUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                  <span className="text-xs text-slate-500">...</span>
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {profile.profile_photo ? t('Change photo') : t('Upload photo')}
              </button>
              <p className="mt-1.5 text-xs text-slate-400">{t('JPG or PNG · Max 5MB')}</p>
              {!profile.profile_photo && (
                <p className="mt-1 text-xs font-medium text-red-500">{t('Required')}</p>
              )}
            </div>
          </div>
          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleProfilePhotoFile(file);
              e.target.value = '';
            }}
          />
        </section>

        {/* ── Verification & identity ────────────────────────────────── */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Verification & identity')}</h2>
          <p className={sectionSubClass}>
            {t(
              'We use this to verify who you are and ensure customers can trust the pros on HandyCall. Your ID number is kept private and never shown publicly.'
            )}
          </p>

          {/* Account type */}
          <p className={labelClass}>{t('I am registering as:')}</p>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {(['individual', 'company'] as const).map((type) => {
              const active = profile.account_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProfile({ ...profile, account_type: type })}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    active
                      ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-emerald-500' : 'border-slate-300'}`}>
                    {active && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {type === 'individual' ? t('Solo / Freelancer') : t('Company')}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {type === 'individual' ? t('Work under your own name') : t('Registered business or team')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Government-issued ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('Government-issued ID *')}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={profile.id_number}
                onChange={(e) => setProfile({ ...profile, id_number: e.target.value.replace(/\D/g, '') })}
                placeholder={t("Driver's license or ID number")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Mobile number *')}</label>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600 whitespace-nowrap">
                  +1
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value.replace(/\D/g, '') })}
                  placeholder={t('Mobile number')}
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className={labelClass}>
                Home address <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-slate-400">(private — not shown to customers)</span>
              </label>
              <input
                type="text"
                required
                value={profile.home_address_street}
                onChange={(e) => setProfile({ ...profile, home_address_street: e.target.value })}
                placeholder="Street address"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={profile.home_address_city}
                onChange={(e) => setProfile({ ...profile, home_address_city: e.target.value })}
                placeholder="City"
                className={inputClass}
              />
              <input
                type="text"
                required
                maxLength={2}
                value={profile.home_address_state}
                onChange={(e) => setProfile({ ...profile, home_address_state: e.target.value.toUpperCase() })}
                placeholder="State"
                className={inputClass}
              />
              <input
                type="text"
                required
                maxLength={5}
                inputMode="numeric"
                value={profile.home_address_zip}
                onChange={(e) => setProfile({ ...profile, home_address_zip: e.target.value.replace(/\D/g, '') })}
                placeholder="ZIP"
                className={inputClass}
              />
            </div>
          </div>

          {/* Company-only fields */}
          {profile.account_type === 'company' && (
            <div className="mt-5 space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isArabic ? 'معلومات الشركة' : 'Company details'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>{t('Company legal name *')}</label>
                  <input
                    type="text"
                    value={profile.company_name_legal}
                    onChange={(e) => setProfile({ ...profile, company_name_legal: e.target.value })}
                    placeholder={t('As it appears on your commercial registration')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('Commercial Registration (CR) number *')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={profile.cr_number}
                    onChange={(e) => setProfile({ ...profile, cr_number: e.target.value.replace(/\D/g, '') })}
                    placeholder={t('Business license number')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('EIN (Employer ID)')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={15}
                    value={profile.vat_number}
                    onChange={(e) => setProfile({ ...profile, vat_number: e.target.value.replace(/\D/g, '') })}
                    placeholder={t('EIN number (optional)')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('Company address')}</label>
                  <input
                    type="text"
                    value={profile.company_address}
                    onChange={(e) => setProfile({ ...profile, company_address: e.target.value })}
                    placeholder={t('City, district, street')}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Consent checkbox — SMS-consent card style */}
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
            <input
              type="checkbox"
              checked={profile.is_background_checked}
              onChange={(e) => setProfile({ ...profile, is_background_checked: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-sm leading-relaxed text-slate-700">
              {t(
                'I confirm this information is accurate and I consent to identity verification as part of joining HandyCall as a Pro.'
              )}
            </span>
          </label>
        </section>

        {/* ── About your business ────────────────────────────────────── */}
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
              'Licensed AC technician with 12 years of experience in Houston. We service homes, apartments, and commercial sites with same-day appointments.'
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
              <input
                type="checkbox"
                checked={profile.is_licensed}
                onChange={(e) => setProfile({ ...profile, is_licensed: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600"
              />
              <span className="text-sm font-medium leading-relaxed text-slate-700">
                {t('I am licensed / certified in my trade')}
              </span>
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

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold">{t('Detailed services win better leads')}</p>
            <p className="mt-1 text-slate-500">
              {t(
                'Customers compare pros based on specialties, exact job types, and the clarity of the services listed. The more detailed you are, the better your leads tend to be.'
              )}
            </p>
          </div>

          <label className={labelClass}>
            {t('Specific services customers can search for')}
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({profile.services_offered.length}/10)
            </span>
          </label>
          {serviceSubtypes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {serviceSubtypes.map((service) => {
                const isChecked = profile.services_offered.includes(service);
                const atLimit = !isChecked && profile.services_offered.length >= 10;
                return (
                <label
                  key={service}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 p-2.5 transition hover:border-emerald-200 hover:bg-emerald-50 ${atLimit ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={atLimit}
                    onChange={() => {
                      if (atLimit) return;
                      setProfile({ ...profile, services_offered: toggle(profile.services_offered, service) });
                    }}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-slate-700">{service}</span>
                </label>
                );
              })}
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
          <CitySearch
            selected={profile.service_cities}
            onChange={(cities) => setProfile({ ...profile, service_cities: cities })}
          />
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Starting price')}</h2>
          <p className={sectionSubClass}>{t('This sets customer expectations before they message you.')}</p>
          <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30">
            <input
              type="checkbox"
              checked={profile.contact_for_price}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  contact_for_price: e.target.checked,
                  starting_price: e.target.checked ? '' : profile.starting_price,
                })
              }
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-sm font-medium text-slate-700">
              Contact me for pricing{' '}
              <span className="text-slate-400">(hides fixed price on your profile)</span>
            </span>
          </label>
          {!profile.contact_for_price && (
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-sm font-semibold text-slate-500">{t('From $')}</span>
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
          )}
        </section>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t('Business hours')}</h2>
          <p className={sectionSubClass}>{t('Standard work week is Mon-Fri. Update anything that differs.')}</p>
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
                  const isWeekend = day === 'Saturday' || day === 'Sunday';
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
                <span className={`${profile.payment_methods.includes(paymentMethod.id) ? 'text-emerald-600' : 'text-slate-400'}`}>{PAYMENT_METHOD_ICONS[paymentMethod.id]}</span>
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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)}
          />

          {/* Photo grid */}
          {profile.portfolio_photos.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {profile.portfolio_photos.map((src, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <img src={src} alt={`Work photo ${index + 1}`} className="h-full w-full object-cover" />
                  {/* Overlay controls */}
                  <div className="absolute inset-0 flex flex-col items-end justify-between bg-black/40 p-1.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold leading-none transition hover:bg-red-700"
                      title="Remove"
                    >
                      ×
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'up')}
                        disabled={index === 0}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-slate-700 text-xs disabled:opacity-30 hover:bg-white"
                        title="Move left"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'down')}
                        disabled={index === profile.portfolio_photos.length - 1}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-slate-700 text-xs disabled:opacity-30 hover:bg-white"
                        title="Move right"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Upload area with drag-and-drop */}
          {profile.portfolio_photos.length < 10 ? (
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length) void handlePhotoFiles(e.dataTransfer.files);
              }}
            >
              <div className="mb-3 text-3xl">📷</div>
              <p className="text-sm font-semibold text-slate-700">
                {isDragging ? 'Drop photos here' : t('Upload photos of your work')}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t('Up to 10 photos · JPG, PNG · Max 5MB each')} · {10 - profile.portfolio_photos.length} remaining
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Drag & drop or click to browse</p>
              <button
                type="button"
                disabled={photoUploading}
                className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                {photoUploading ? 'Compressing...' : t('Add photos')}
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400">10 / 10 photos added. Remove one to add more.</p>
          )}

          <div className="mt-4">
            <label className={labelClass}>{t('Describe your recent projects (optional)')}</label>
            <textarea
              value={profile.portfolio_note}
              onChange={(e) => setProfile({ ...profile, portfolio_note: e.target.value })}
              rows={3}
              maxLength={300}
              placeholder={t(
                'Installed 200+ AC units across Houston in 2025. Specialise in commercial buildings and homes.'
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
