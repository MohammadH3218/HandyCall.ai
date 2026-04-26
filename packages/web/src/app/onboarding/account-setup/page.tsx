'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api-client';
import { IconLoader2 } from '@tabler/icons-react';

const CustomerAddressMap = dynamic(
  () => import('@/components/customer/customer-address-map'),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-[28px] bg-slate-100" /> },
);

const SAUDI_CITIES = [
  'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran',
  'Tabuk', 'Buraidah', 'Khamis Mushait', 'Abha', 'Taif', 'Najran',
  'Hail', 'Jizan', 'Yanbu', 'Al Jubail', 'Arar',
];

type FormState = {
  id_type: 'NATIONAL_ID' | 'IQAMA';
  id_number: string;
  phone_digits: string;         // 9 local digits (5XXXXXXXX)
  national_address_short: string;
  national_address_building: string;
  national_address_street: string;
  national_address_district: string;
  national_address_city: string;
  national_address_postal_code: string;
  map_lat: number | null;
  map_lng: number | null;
};

/** Accept raw input and normalise to 9 local digits (5XXXXXXXX) */
function sanitizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00966')) return digits.slice(5, 14);
  if (digits.startsWith('966'))   return digits.slice(3, 12);
  if (digits.startsWith('0'))     return digits.slice(1, 10);
  return digits.slice(0, 9);
}

/** Display: 5XX XXX XXX */
function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export default function AccountSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    id_type: 'NATIONAL_ID',
    id_number: '',
    phone_digits: '',
    national_address_short: '',
    national_address_building: '',
    national_address_street: '',
    national_address_district: '',
    national_address_city: 'Riyadh',
    national_address_postal_code: '',
    map_lat: null,
    map_lng: null,
  });

  // Prefill from existing pro record if present
  useEffect(() => {
    apiClient.getMyPro()
      .then((pro: any) => {
        if (!pro) { setLoading(false); return; }

        // Already past this step → send to correct page
        const status = pro?.status ?? '';
        if (status === 'ACTIVE' || status === 'PENDING_REVIEW' || status === 'REJECTED' || status === 'SUSPENDED') {
          router.replace('/pro/review-status');
          return;
        }
        if (pro?.account_setup_done && pro?.marketplace_profile_completed) {
          router.replace('/onboarding/billing');
          return;
        }
        if (pro?.account_setup_done) {
          router.replace('/onboarding/marketplace-profile');
          return;
        }

        // Extract 9 local digits from stored phone
        let storedDigits = '';
        const rawPhone = String(pro.phone_number || '');
        if (rawPhone) storedDigits = sanitizePhoneDigits(rawPhone);

        setForm((prev) => ({
          ...prev,
          id_type: pro.id_type ?? prev.id_type,
          id_number: pro.id_number ?? prev.id_number,
          phone_digits: storedDigits || prev.phone_digits,
          national_address_short: pro.national_address_short ?? prev.national_address_short,
          national_address_building: pro.national_address_building ?? prev.national_address_building,
          national_address_street: pro.national_address_street ?? prev.national_address_street,
          national_address_district: pro.national_address_district ?? prev.national_address_district,
          national_address_city: pro.national_address_city ?? prev.national_address_city,
          national_address_postal_code: pro.national_address_postal_code ?? prev.national_address_postal_code,
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const setField = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{10}$/.test(form.id_number)) {
      setError('ID number must be exactly 10 digits.');
      return;
    }
    if (!/^5\d{8}$/.test(form.phone_digits)) {
      setError('Enter a valid Saudi mobile number (9 digits starting with 5, e.g. 506268728).');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.proOnboardingAccountSetup({
        id_type: form.id_type,
        id_number: form.id_number,
        phone_number: `+966${form.phone_digits}`,
        national_address_short: form.national_address_short || undefined,
        national_address_building: form.national_address_building || undefined,
        national_address_street: form.national_address_street || undefined,
        national_address_district: form.national_address_district || undefined,
        national_address_city: form.national_address_city || undefined,
        national_address_postal_code: form.national_address_postal_code || undefined,
      });
      router.replace('/onboarding/marketplace-profile');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const inputCls =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Account Setup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us a little about yourself so we can verify your identity and get your profile ready.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Identity ───────────────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-sm font-semibold text-slate-800">Identity Verification</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ID Type</label>
              <select value={form.id_type} onChange={setField('id_type')} className={inputCls}>
                <option value="NATIONAL_ID">National ID</option>
                <option value="IQAMA">Iqama</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>ID Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={form.id_number}
                onChange={setField('id_number')}
                placeholder="10-digit number"
                required
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* ── Mobile Number ──────────────────────────────────────────── */}
        <section>
          <label className={labelCls}>Mobile Number</label>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <span aria-hidden="true">🇸🇦</span>
              <span>+966</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={formatPhoneDisplay(form.phone_digits)}
              onChange={(e) => setForm((prev) => ({ ...prev, phone_digits: sanitizePhoneDigits(e.target.value) }))}
              placeholder="5XX XXX XXX"
              className="w-full bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">9 digits starting with 5 — e.g. 506268728</p>
        </section>

        {/* ── National Address ───────────────────────────────────────── */}
        <section>
          <p className="mb-3 text-sm font-semibold text-slate-800">National Address</p>
          <p className="mb-4 text-xs text-slate-500">
            Pin your location on the map to auto-fill your address, or type it manually below.
          </p>

          {/* Map */}
          <div className="mb-5">
            <CustomerAddressMap
              latitude={form.map_lat}
              longitude={form.map_lng}
              onPositionChange={(pos) =>
                setForm((prev) => ({ ...prev, map_lat: pos.lat, map_lng: pos.lng }))
              }
              onAddressResolved={({ addressLine1, neighborhood }) => {
                setForm((prev) => ({
                  ...prev,
                  national_address_street: addressLine1 || prev.national_address_street,
                  national_address_district: neighborhood || prev.national_address_district,
                }));
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Short Code</label>
                <input
                  type="text"
                  maxLength={8}
                  value={form.national_address_short}
                  onChange={setField('national_address_short')}
                  placeholder="AAAA1234"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Building No.</label>
                <input
                  type="text"
                  value={form.national_address_building}
                  onChange={setField('national_address_building')}
                  placeholder="e.g. 1234"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Street Name</label>
              <input
                type="text"
                value={form.national_address_street}
                onChange={setField('national_address_street')}
                placeholder="e.g. King Fahd Road"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>District</label>
                <input
                  type="text"
                  value={form.national_address_district}
                  onChange={setField('national_address_district')}
                  placeholder="e.g. Al Olaya"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Postal Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={form.national_address_postal_code}
                  onChange={setField('national_address_postal_code')}
                  placeholder="XXXXX"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>City</label>
              <select value={form.national_address_city} onChange={setField('national_address_city')} className={inputCls}>
                {SAUDI_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <IconLoader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Continue to Marketplace Profile →'
          )}
        </button>
      </form>
    </div>
  );
}
