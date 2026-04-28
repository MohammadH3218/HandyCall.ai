'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/portal/page-header';
import { apiClient } from '@/lib/api-client';
import { SAUDI_MARKETPLACE_CITIES } from '@/constants/houston-areas';
import { ServiceCategoryCombobox } from '@/components/marketplace/service-category-combobox';
import { IconBriefcase, IconCheck, IconChevronRight } from '@tabler/icons-react';

const MIN_DESCRIPTION_LENGTH = 50;

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const descriptionValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const charsRemaining = Math.max(0, MIN_DESCRIPTION_LENGTH - description.trim().length);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.postOpenJob({
        service_category: category,
        job_description: description.trim(),
        district,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <IconCheck className="h-10 w-10 text-emerald-600" stroke={2} />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-900">Job posted!</h2>
        <p className="mt-3 max-w-sm text-slate-500">
          Your job post is now live on the board. Pros in your area will see it and the first to
          accept will be connected with you directly. You&apos;ll get notified when someone claims
          it.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Posts expire after 48 hours if no pro accepts.
        </p>
        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => router.push('/dashboard/requests')}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            View my posts
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setCategory('');
              setDescription('');
              setDistrict('');
              setContactName('');
              setContactPhone('');
            }}
          >
            Post another job
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Requests"
        title="Post a Job"
        subtitle="Describe what you need and pros in your area will come to you. Free to post — pros pay a small lead fee to connect."
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                step > s
                  ? 'bg-emerald-600 text-white'
                  : step === s
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s ? <IconCheck className="h-4 w-4" stroke={2.5} /> : s}
            </div>
            <span
              className={`text-xs font-medium ${step === s ? 'text-slate-800' : 'text-slate-400'}`}
            >
              {['Service', 'Details', 'Contact'][idx]}
            </span>
            {idx < 2 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-4">
          <ServiceCategoryCombobox
            value={category}
            onChange={setCategory}
            helperText="Search every category and niche service so the right pros see your job."
          />

          <Button
            onClick={() => setStep(2)}
            disabled={!category}
            className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Continue
            <IconChevronRight className="h-4 w-4" stroke={2} />
          </Button>
        </div>
      )}

      {/* Step 2: Description + District */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Describe the job</h3>
            <p className="mt-1 text-sm text-slate-500">
              Be specific — what&apos;s broken, how long it&apos;s been a problem, any relevant
              details. Better descriptions get faster responses.
            </p>
          </div>

          <div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. My AC unit stopped cooling two days ago. It turns on but blows warm air. The unit is 3 years old, a Samsung split unit. I need someone who can diagnose and fix the issue this week."
              rows={5}
              className="resize-none"
            />
            <p
              className={`mt-1.5 text-xs ${descriptionValid ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              {descriptionValid
                ? '✓ Good description'
                : `${charsRemaining} more character${charsRemaining !== 1 ? 's' : ''} needed`}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Your district</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select your district…</option>
              {SAUDI_MARKETPLACE_CITIES.map((d) => (
                <option key={d.value} value={d.label}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!descriptionValid || !district}
              className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Continue
              <IconChevronRight className="h-4 w-4" stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Contact + Review */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Contact info (optional)</h3>
            <p className="mt-1 text-sm text-slate-500">
              Only shared with the pro after they claim your job. You can also just use in-app chat.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Your name</label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Mohammed"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+966 5X XXX XXXX"
                type="tel"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Review your post</p>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="font-medium text-slate-800">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">District</span>
                <span className="font-medium text-slate-800">{district}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expires after</span>
                <span className="font-medium text-slate-800">48 hours</span>
              </div>
            </div>
            <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
              {description.trim().slice(0, 120)}
              {description.trim().length > 120 ? '…' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
            <IconBriefcase className="h-4 w-4 shrink-0" stroke={1.5} />
            <p>
              Posting is <strong>free</strong>. The pro pays the lead fee only when they accept your
              job.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <IconBriefcase className="h-4 w-4" stroke={1.8} />
              {submitting ? 'Posting…' : 'Post job'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
