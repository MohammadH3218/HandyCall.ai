'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/ui/logo';

// ── Constants ────────────────────────────────────────────────────────────────

const SAUDI_CITIES = [
  'Riyadh (الرياض)',
  'Jeddah (جدة)',
  'Dammam (الدمام)',
  'Khobar (الخبر)',
  'Mecca (مكة المكرمة)',
  'Medina (المدينة المنورة)',
  'Abha (أبها)',
  'Tabuk (تبوك)',
  'Qassim (القصيم)',
  'Hail (حائل)',
];

const SERVICES_BY_CATEGORY: Record<string, string[]> = {
  'AC & HVAC': ['AC Repair', 'AC Installation', 'AC Maintenance', 'AC Deep Cleaning', 'Duct Cleaning', 'Central AC Systems', 'Split AC Unit Install', 'Ventilation Systems', 'Smart Thermostat Install', 'HVAC Inspection'],
  'Plumbing': ['Pipe Repair', 'Pipe Installation', 'Drain Cleaning', 'Water Heater Repair', 'Water Heater Installation', 'Bathroom Fixtures Install', 'Kitchen Plumbing', 'Leak Detection', 'Faucet Repair', 'Toilet Repair', 'Water Pump Service', 'Water Tank Cleaning', 'Sewer Line Cleaning'],
  'Electrical': ['Outlet Installation', 'Lighting Installation', 'Wiring & Rewiring', 'Circuit Breaker Repair', 'Fuse Box Upgrade', 'Ceiling Fan Install', 'EV Charger Installation', 'Generator Installation', 'Smart Home Wiring', 'Outdoor Lighting', 'Security Lighting', 'Electrical Inspection'],
  'House Cleaning': ['Regular Cleaning', 'Deep Cleaning', 'Move-In Cleaning', 'Move-Out Cleaning', 'Post-Construction Cleaning', 'Maid Service', 'Sofa Cleaning', 'Mattress Cleaning', 'Carpet Cleaning', 'Window Cleaning', 'Kitchen Deep Clean', 'Bathroom Cleaning', 'Villa Cleaning', 'Office Cleaning', 'Eid Cleaning'],
  'Car Washing & Detailing': ['Basic Car Wash', 'Mobile Car Wash', 'Full Car Detail', 'Interior Car Cleaning', 'Engine Cleaning', 'Car Polishing', 'Paint Protection Film', 'Ceramic Coating', 'Steam Car Cleaning', 'Upholstery Cleaning'],
  'Appliance Repair': ['Washing Machine Repair', 'Dryer Repair', 'Refrigerator Repair', 'Dishwasher Repair', 'Oven Repair', 'Stove Repair', 'Microwave Repair', 'Water Heater Repair', 'Water Dispenser Repair', 'TV Mounting', 'TV Repair', 'Vacuum Repair'],
  'Moving & Delivery': ['Home Moving', 'Office Moving', 'Furniture Moving', 'Furniture Delivery', 'Box Packing Service', 'Unpacking Service', 'Heavy Item Moving', 'Same-Day Delivery', 'Storage Solutions', 'Junk Removal'],
  'Painting': ['Interior Painting', 'Exterior Painting', 'Wall Texture', 'Wallpaper Removal', 'Epoxy Floor Coating', 'Stucco Application', 'Decorative Painting', 'Ceiling Painting', 'Villa Painting', 'Touch-Up Painting'],
  'Carpentry': ['Furniture Assembly', 'Custom Furniture', 'Door Installation', 'Door Repair', 'Cabinet Installation', 'Kitchen Cabinet Install', 'Closet Build', 'Shelving Install', 'Wood Flooring', 'Wardrobe Install', 'Gypsum Board Work', 'False Ceiling'],
  'Pest Control': ['Cockroach Control', 'Termite Treatment', 'Bed Bug Treatment', 'Rodent Control', 'Mosquito Control', 'Scorpion Control', 'Ant Control', 'General Fumigation', 'Pest Inspection'],
  'Landscaping': ['Garden Design', 'Lawn Maintenance', 'Tree Trimming', 'Tree Removal', 'Irrigation System Install', 'Artificial Grass Install', 'Outdoor Lighting Install', 'Palm Tree Care', 'Hedge Trimming', 'Paving & Walkways', 'Pergola Install'],
  'Tile & Flooring': ['Tile Installation', 'Tile Repair', 'Bathroom Tiling', 'Marble Polishing', 'Marble Repair', 'Hardwood Flooring', 'Vinyl Flooring', 'Epoxy Flooring', 'Grout Repair', 'Floor Polishing'],
  'Security Systems': ['CCTV Installation', 'Security Camera Install', 'Alarm System Install', 'Smart Lock Install', 'Intercom System', 'Access Control System', 'Home Automation', 'Video Doorbell Install'],
  'Doors & Windows': ['Door Installation', 'Door Repair', 'Window Installation', 'Window Repair', 'Glass Replacement', 'Double Glazing', 'Screen / Mesh Repair', 'Lock Change', 'Sliding Door Repair', 'Roller Shutter Install'],
  'Bathroom Renovation': ['Full Bathroom Remodel', 'Shower Installation', 'Bathtub Install', 'Vanity Install', 'Mirror Install', 'Toilet Replacement', 'Bathroom Waterproofing', 'Bathroom Tiling'],
  'Handyman': ['Furniture Assembly', 'TV Mounting', 'Picture Hanging', 'Shelf Installation', 'Curtain & Blind Install', 'Minor Repairs', 'Gypsum Work', 'False Ceiling Repair', 'Caulking & Sealing', 'Touch-Up Repairs', 'Locksmith Services'],
  'Roofing & Waterproofing': ['Roof Repair', 'Waterproofing', 'Thermal Insulation', 'Leak Repair', 'Roof Coating', 'Foam Insulation', 'Heat Insulation'],
  'Pool & Water Features': ['Pool Cleaning', 'Pool Maintenance', 'Pool Repair', 'Pool Chemical Balancing', 'Fountain Maintenance', 'Jacuzzi Repair'],
  'Curtains & Blinds': ['Curtain Installation', 'Blind Installation', 'Roller Blind Install', 'Curtain Cleaning', 'Motorized Blinds', 'Curtain Rail Install'],
  'Tank & Sanitation': ['Water Tank Cleaning', 'Septic Tank Cleaning', 'Grease Trap Cleaning', 'Sewer Cleaning', 'Drain Unblocking'],
};

const PROPERTY_TYPES = ['Villa / House', 'Apartment', 'Townhouse', 'Office', 'Commercial / Warehouse', 'Government Building'];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'mada', label: 'Mada (Bank Transfer)', icon: '🏦' },
  { id: 'stc_pay', label: 'STC Pay', icon: '📱' },
  { id: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'bank_transfer', label: 'Bank Transfer (IBAN)', icon: '🏧' },
];

const EMPLOYEE_OPTIONS = ['Just me (solo)', '2–5 employees', '6–20 employees', '20+ employees'];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'];

// ── Types ────────────────────────────────────────────────────────────────────

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
  Sunday:    { open: true,  from: '8:00 AM',  to: '6:00 PM' },
  Monday:    { open: true,  from: '8:00 AM',  to: '6:00 PM' },
  Tuesday:   { open: true,  from: '8:00 AM',  to: '6:00 PM' },
  Wednesday: { open: true,  from: '8:00 AM',  to: '6:00 PM' },
  Thursday:  { open: true,  from: '8:00 AM',  to: '6:00 PM' },
  Friday:    { open: false, from: '12:00 PM', to: '6:00 PM' },
  Saturday:  { open: false, from: '8:00 AM',  to: '6:00 PM' },
};

// ── Shared style helpers ─────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';
const sectionClass = 'rounded-2xl border border-slate-100 bg-white p-6 shadow-sm';
const sectionTitleClass = 'text-base font-bold text-slate-900 mb-1';
const sectionSubClass = 'text-xs text-slate-400 mb-5';

// ── Component ────────────────────────────────────────────────────────────────

export default function MarketplaceProfilePage() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<MarketplaceProfile>({
    bio: '',
    years_in_business: '',
    employees: '',
    license_type: '',
    license_number: '',
    is_licensed: false,
    is_background_checked: false,
    service_category: (company as any)?.service_type || '',
    services_offered: [],
    property_types: [],
    payment_methods: ['cash'],
    instagram: '',
    snapchat: '',
    twitter: '',
    website: '',
    starting_price: '',
    service_cities: [],
    business_hours: defaultHours,
    portfolio_note: '',
  });

  // Determine which service subtypes to show
  const relevantCategory =
    SERVICES_BY_CATEGORY[profile.service_category] ? profile.service_category : 'Other';
  const serviceSubtypes = SERVICES_BY_CATEGORY[relevantCategory] || SERVICES_BY_CATEGORY['Other'];

  function toggle<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  function updateHours(day: string, field: keyof BusinessHourEntry, value: string | boolean) {
    setProfile((p) => ({
      ...p,
      business_hours: {
        ...p.business_hours,
        [day]: { ...p.business_hours[day], [field]: value },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await apiClient.updateMyCompany({
        marketplace_profile: profile,
        marketplace_profile_completed: true,
      } as any);
      setSaved(true);
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Logo width={130} height={32} />
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Marketplace Profile Setup</span>
            <button
              onClick={() => router.replace('/dashboard')}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              Skip for now
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Complete your marketplace profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Customers browse your profile before booking. The more complete it is, the more jobs you'll win.
          </p>
          <p
            className="mt-1 text-xs text-slate-400"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "'Segoe UI','Tahoma','Arial Unicode MS',sans-serif" }}
          >
            كلما كان ملفك أكثر اكتمالاً، زادت فرص الحصول على عملاء
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* ── 1. About ──────────────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>About your business</h2>
            <p className={sectionSubClass}>Tell customers who you are and why they should hire you.</p>

            <label className={labelClass}>Business bio *</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              maxLength={500}
              placeholder="e.g. Licensed AC technician with 12 years of experience in Riyadh. We service all major brands and offer same-day appointments..."
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-right text-xs text-slate-400">{profile.bio.length} / 500</p>
          </section>

          {/* ── 2. Overview ──────────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Overview</h2>
            <p className={sectionSubClass}>Key facts that appear on your profile card.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Years in business</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={profile.years_in_business}
                  onChange={(e) => setProfile({ ...profile, years_in_business: e.target.value })}
                  placeholder="e.g. 8"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Number of employees</label>
                <select
                  value={profile.employees}
                  onChange={(e) => setProfile({ ...profile, employees: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {EMPLOYEE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.is_licensed}
                  onChange={(e) => setProfile({ ...profile, is_licensed: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-sm font-medium text-slate-700">I am licensed / certified in my trade</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.is_background_checked}
                  onChange={(e) => setProfile({ ...profile, is_background_checked: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <span className="text-sm font-medium text-slate-700">I agree to identity & background verification</span>
              </label>
            </div>
          </section>

          {/* ── 3. Credentials ──────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Credentials</h2>
            <p className={sectionSubClass}>License details appear as a trust badge on your public profile.</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>License type</label>
                <input
                  type="text"
                  value={profile.license_type}
                  onChange={(e) => setProfile({ ...profile, license_type: e.target.value })}
                  placeholder="e.g. Electrician – Master"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>License / certificate number</label>
                <input
                  type="text"
                  value={profile.license_number}
                  onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ── 4. Services Offered ──────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Services offered</h2>
            <p className={sectionSubClass}>Select everything you offer — customers filter by these.</p>

            <div>
              <label className={labelClass}>Service category</label>
              <select
                value={profile.service_category}
                onChange={(e) =>
                  setProfile({ ...profile, service_category: e.target.value, services_offered: [] })
                }
                className={`${inputClass} mb-4`}
              >
                <option value="">Select category...</option>
                {Object.keys(SERVICES_BY_CATEGORY).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label className={labelClass}>Service subtypes</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {serviceSubtypes.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-100 p-2.5 hover:border-emerald-200 hover:bg-emerald-50 transition">
                    <input
                      type="checkbox"
                      checked={profile.services_offered.includes(s)}
                      onChange={() =>
                        setProfile({ ...profile, services_offered: toggle(profile.services_offered, s) })
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Property types served</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROPERTY_TYPES.map((pt) => (
                  <label key={pt} className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-100 p-2.5 hover:border-emerald-200 hover:bg-emerald-50 transition">
                    <input
                      type="checkbox"
                      checked={profile.property_types.includes(pt)}
                      onChange={() =>
                        setProfile({ ...profile, property_types: toggle(profile.property_types, pt) })
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium text-slate-700">{pt}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* ── 5. Service Area ─────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Cities you serve</h2>
            <p className={sectionSubClass}>Customers search by city — select all areas you cover.</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SAUDI_CITIES.map((city) => (
                <label key={city} className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-100 p-2.5 hover:border-emerald-200 hover:bg-emerald-50 transition">
                  <input
                    type="checkbox"
                    checked={profile.service_cities.includes(city)}
                    onChange={() =>
                      setProfile({ ...profile, service_cities: toggle(profile.service_cities, city) })
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0"
                  />
                  <span className="text-xs font-medium text-slate-700">{city}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── 6. Starting Price ────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Starting price</h2>
            <p className={sectionSubClass}>Shown on your profile card to set expectations. You can quote per job too.</p>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">From SAR</span>
              <input
                type="number"
                min={0}
                value={profile.starting_price}
                onChange={(e) => setProfile({ ...profile, starting_price: e.target.value })}
                placeholder="e.g. 150"
                className={`${inputClass} max-w-xs`}
              />
              <span className="text-sm text-slate-400">/ service</span>
            </div>
          </section>

          {/* ── 7. Business Hours ────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Business hours</h2>
            <p className={sectionSubClass}>
              When can customers book you? (Saudi work week: Sun–Thu. Fri–Sat is the weekend.)
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400 w-28">Day</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400 w-20">Open</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400">From</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400">To</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => {
                    const h = profile.business_hours[day];
                    const isWeekend = day === 'Friday' || day === 'Saturday';
                    return (
                      <tr key={day} className="border-b border-slate-50 last:border-none">
                        <td className="py-2.5 pr-4">
                          <span className={`text-sm font-medium ${isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                            {day}
                            {isWeekend && <span className="ml-1 text-xs text-slate-300">(weekend)</span>}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <input
                            type="checkbox"
                            checked={h.open}
                            onChange={(e) => updateHours(day, 'open', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <select
                            disabled={!h.open}
                            value={h.from}
                            onChange={(e) => updateHours(day, 'from', e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                          >
                            {TIMES.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5">
                          <select
                            disabled={!h.open}
                            value={h.to}
                            onChange={(e) => updateHours(day, 'to', e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                          >
                            {TIMES.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 8. Payment Methods ──────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Payment methods</h2>
            <p className={sectionSubClass}>Select all payment methods you accept from customers.</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm.id}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-xl border p-3 transition ${
                    profile.payment_methods.includes(pm.id)
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-100 hover:border-emerald-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={profile.payment_methods.includes(pm.id)}
                    onChange={() =>
                      setProfile({
                        ...profile,
                        payment_methods: toggle(profile.payment_methods, pm.id),
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0"
                  />
                  <span className="text-lg leading-none">{pm.icon}</span>
                  <span className="text-xs font-semibold text-slate-700">{pm.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── 9. Social Media ─────────────────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Social media & website</h2>
            <p className={sectionSubClass}>
              Links shown on your profile so customers can see your work online.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <span className="mr-1">📸</span> Instagram username
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                  <span className="flex-shrink-0 bg-slate-50 px-3 py-3 text-sm text-slate-400 border-r border-slate-200">
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.instagram}
                    onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                    placeholder="yourhandle"
                    className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="mr-1">👻</span> Snapchat username
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                  <span className="flex-shrink-0 bg-slate-50 px-3 py-3 text-sm text-slate-400 border-r border-slate-200">
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.snapchat}
                    onChange={(e) => setProfile({ ...profile, snapchat: e.target.value })}
                    placeholder="yourhandle"
                    className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="mr-1">🐦</span> Twitter / X username
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                  <span className="flex-shrink-0 bg-slate-50 px-3 py-3 text-sm text-slate-400 border-r border-slate-200">
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.twitter}
                    onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                    placeholder="yourhandle"
                    className="flex-1 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="mr-1">🌐</span> Website URL
                </label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://yoursite.com"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ── 10. Work Photos / Portfolio ─────────────────────────── */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Projects & work photos</h2>
            <p className={sectionSubClass}>
              Customers love seeing real examples of your work. Photos can increase bookings by up to 3x.
            </p>

            {/* Upload area placeholder (file handling requires storage setup) */}
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center hover:border-emerald-300 transition">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm font-semibold text-slate-700">Upload photos of your work</p>
              <p className="mt-1 text-xs text-slate-400">Up to 10 photos · JPG, PNG · Max 5MB each</p>
              <button
                type="button"
                className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                onClick={() => alert('Photo upload will be available once your account is fully set up. You can add photos from your dashboard settings.')}
              >
                Add Photos
              </button>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Describe your recent projects (optional)</label>
              <textarea
                value={profile.portfolio_note}
                onChange={(e) => setProfile({ ...profile, portfolio_note: e.target.value })}
                rows={3}
                maxLength={300}
                placeholder="e.g. Installed 200+ AC units across Riyadh in 2025. Specialise in commercial buildings and villas."
                className={`${inputClass} resize-none`}
              />
            </div>
          </section>

          {/* ── Error ────────────────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── CTA ──────────────────────────────────────────────────── */}
          {saved ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
              <div className="text-4xl">✅</div>
              <p className="text-base font-bold text-emerald-800">Profile saved! Taking you to your dashboard...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
                    </svg>
                    Saving profile...
                  </>
                ) : (
                  'Save profile & go to dashboard →'
                )}
              </button>
              <button
                onClick={() => router.replace('/dashboard')}
                className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Finish later
              </button>
            </div>
          )}

          <p className="pb-4 text-center text-xs text-slate-400">
            You can update your marketplace profile anytime from Dashboard → Settings
          </p>
        </div>
      </main>
    </div>
  );
}
