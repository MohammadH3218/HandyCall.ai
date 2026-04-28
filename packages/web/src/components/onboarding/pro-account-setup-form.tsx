'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertCircle, IconCircleCheck, IconLoader2, IconShieldCheck } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type AccountFormState = {
  id_type: 'NATIONAL_ID' | 'IQAMA';
  national_id: string;
  iqama_number: string;
  phone_number: string;
  national_address: string;
};

export function ProAccountSetupForm() {
  const router = useRouter();
  const { proProfile, setProProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<AccountFormState>({
    id_type: 'NATIONAL_ID',
    national_id: '',
    iqama_number: '',
    phone_number: '',
    national_address: '',
  });

  useEffect(() => {
    if (!proProfile) return;
    setForm({
      id_type: proProfile.id_type || 'NATIONAL_ID',
      national_id: proProfile.national_id || '',
      iqama_number: proProfile.iqama_number || '',
      phone_number: proProfile.phone_number || '',
      national_address: proProfile.national_address || '',
    });
  }, [proProfile]);

  const requiredIdField = form.id_type === 'NATIONAL_ID' ? 'national_id' : 'iqama_number';

  const validation = useMemo(() => {
    const nextErrors: Record<string, string> = {};

    if (!form.phone_number.trim()) {
      nextErrors.phone_number = 'Phone number is required.';
    } else if (!/^\+9665\d{8}$/.test(form.phone_number.trim())) {
      nextErrors.phone_number = 'Use a valid Saudi mobile number like +9665XXXXXXXX.';
    }

    const idValue = form.id_type === 'NATIONAL_ID' ? form.national_id : form.iqama_number;
    if (!idValue.trim()) {
      nextErrors[requiredIdField] =
        form.id_type === 'NATIONAL_ID' ? 'Saudi ID is required.' : 'Iqama number is required.';
    } else if (!/^\d{10}$/.test(idValue.trim())) {
      nextErrors[requiredIdField] =
        form.id_type === 'NATIONAL_ID'
          ? 'Saudi ID must be exactly 10 digits.'
          : 'Iqama number must be exactly 10 digits.';
    }

    if (!form.national_address.trim()) {
      nextErrors.national_address = 'National address is required.';
    } else if (form.national_address.trim().length < 12) {
      nextErrors.national_address = 'Add the full registered national address.';
    }

    return nextErrors;
  }, [form, requiredIdField]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors(validation);
    setError(null);
    setNotice(null);

    if (Object.keys(validation).length > 0) {
      setError('Complete the required account details before continuing.');
      return;
    }

    try {
      setLoading(true);
      const result = await apiClient.submitProAccountSetup({
        id_type: form.id_type,
        national_id: form.id_type === 'NATIONAL_ID' ? form.national_id.trim() : undefined,
        iqama_number: form.id_type === 'IQAMA' ? form.iqama_number.trim() : undefined,
        phone_number: form.phone_number.trim(),
        national_address: form.national_address.trim(),
      });

      setProProfile(result);

      const manualReview =
        result?.id_verification_status === 'MANUAL_REVIEW' ||
        result?.national_address_verification_status === 'MANUAL_REVIEW';

      if (manualReview) {
        setNotice(
          'Automated Saudi verification is not configured in this environment yet, so these checks will be completed during admin review.',
        );
      }

      router.push('/onboarding/marketplace-profile');
    } catch (err: any) {
      setError(err?.message || 'Failed to save account setup.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <IconShieldCheck className="h-6 w-6" stroke={1.7} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">
              Account setup
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Verify the account behind this pro profile
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              We collect this before marketplace setup so HandyCall can verify identity, confirm a Saudi mobile number, and hold the account for admin approval before anything is published.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {notice}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-900">
              Account holder type <span className="text-rose-500">*</span>
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: 'NATIONAL_ID', title: 'Saudi national', body: 'Verify with Saudi ID and Nafath.' },
                { value: 'IQAMA', title: 'Iqama holder', body: 'Verify with Iqama and Nafath.' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      id_type: option.value as AccountFormState['id_type'],
                    }))
                  }
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    form.id_type === option.value
                      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{option.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{option.body}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number" className="text-sm font-semibold text-slate-900">
              Saudi mobile number <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="phone_number"
              value={form.phone_number}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone_number: event.target.value }))
              }
              placeholder="+9665XXXXXXXX"
              className={fieldErrors.phone_number ? 'border-rose-300 focus-visible:ring-rose-200' : ''}
            />
            {fieldErrors.phone_number ? (
              <p className="text-sm text-rose-600">{fieldErrors.phone_number}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={requiredIdField}
              className="text-sm font-semibold text-slate-900"
            >
              {form.id_type === 'NATIONAL_ID' ? 'Saudi ID number' : 'Iqama number'}{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id={requiredIdField}
              value={form.id_type === 'NATIONAL_ID' ? form.national_id : form.iqama_number}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [requiredIdField]: event.target.value,
                }))
              }
              placeholder="10 digits"
              className={fieldErrors[requiredIdField] ? 'border-rose-300 focus-visible:ring-rose-200' : ''}
            />
            {fieldErrors[requiredIdField] ? (
              <p className="text-sm text-rose-600">{fieldErrors[requiredIdField]}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="national_address" className="text-sm font-semibold text-slate-900">
              National address <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="national_address"
              value={form.national_address}
              onChange={(event) =>
                setForm((current) => ({ ...current, national_address: event.target.value }))
              }
              placeholder="Building number, street, district, city, postal code, and additional number"
              className={`min-h-[112px] ${fieldErrors.national_address ? 'border-rose-300 focus-visible:ring-rose-200' : ''}`}
            />
            {fieldErrors.national_address ? (
              <p className="text-sm text-rose-600">{fieldErrors.national_address}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-start gap-3">
          <IconAlertCircle className="mt-0.5 h-5 w-5 text-slate-400" stroke={1.7} />
          <div className="space-y-2 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-900">How verification works</p>
            <p>Nafath is used for Saudi nationals and Iqama holders, and the national address is checked against the registered address data when provider credentials are available.</p>
            <p>If those providers are not configured in the current environment, the account still moves into admin review and the verification is completed manually before approval.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={loading} className="min-w-[220px]">
          {loading ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" stroke={1.7} /> : <IconCircleCheck className="mr-2 h-4 w-4" stroke={1.7} />}
          Save account setup
        </Button>
      </div>
    </form>
  );
}
