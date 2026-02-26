'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { ChevronRight, ChevronLeft, CheckCircle, Wrench, MapPin, User, Send } from 'lucide-react';

const SERVICE_CATEGORIES = [
  'Plumbing',
  'HVAC',
  'Electrical',
  'Cleaning',
  'Landscaping',
  'Handyman',
  'Pest Control',
  'Roofing',
  'Painting',
  'Flooring',
  'Moving',
  'Appliance Repair',
  'Carpentry',
  'Windows & Doors',
  'Pool & Spa',
  'Other',
];

const URGENCY_OPTIONS = [
  { value: 'emergency', label: 'Emergency', description: 'Need help within hours', color: 'border-red-300 text-red-700 bg-red-50' },
  { value: 'urgent', label: 'Within 1–2 days', description: 'Need it done soon', color: 'border-amber-300 text-amber-700 bg-amber-50' },
  { value: 'this_week', label: 'This week', description: 'Flexible but soon', color: 'border-blue-300 text-blue-700 bg-blue-50' },
  { value: 'flexible', label: "I'm flexible", description: 'No rush, just get it done', color: 'border-slate-300 text-slate-700 bg-slate-50' },
];

type Step = 1 | 2 | 3 | 4;

interface FormData {
  service_category: string;
  job_description: string;
  urgency: string;
  location_zipcode: string;
  location_city: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Service',
  2: 'Details',
  3: 'Location',
  4: 'Contact',
};

function RequestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams.get('category') || '';

  const [step, setStep] = useState<Step>(preselectedCategory ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    service_category: preselectedCategory,
    job_description: '',
    urgency: '',
    location_zipcode: '',
    location_city: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  const set = (key: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canAdvance = (): boolean => {
    if (step === 1) return !!form.service_category;
    if (step === 2) return form.job_description.trim().length >= 20 && !!form.urgency;
    if (step === 3) return form.location_zipcode.trim().length >= 5;
    if (step === 4) return !!form.contact_name && !!form.contact_email;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.submitQuoteRequest(form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-10 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Request Sent!</h1>
          <p className="mt-2 text-slate-600">
            Pros in your area have been notified. You'll receive quotes via email at{' '}
            <strong>{form.contact_email}</strong>.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Most customers receive their first response within 2 hours.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/find-pros">Browse Pros Now</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/">
            <Logo width={130} height={32} />
          </Link>
          <Link href="/find-pros" className="text-sm text-slate-500 hover:text-slate-700">
            Browse pros instead
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {([1, 2, 3, 4] as Step[]).map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      s < step
                        ? 'bg-emerald-500 text-white'
                        : s === step
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  <span className={`text-xs font-medium ${s === step ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative h-1 rounded-full bg-slate-100">
              <div
                className="absolute left-0 top-0 h-1 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            {/* Step 1: Service Category */}
            {step === 1 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">What service do you need?</h2>
                </div>
                <p className="text-sm text-slate-500 mb-5">Select the category that best matches your job.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => set('service_category', cat)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                        form.service_category === cat
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Job Description + Urgency */}
            {step === 2 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">Describe your job</h2>
                </div>
                <p className="text-sm text-slate-500 mb-5">
                  The more detail you provide, the more accurate your quotes will be.
                </p>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="desc">Job Description <span className="text-red-500">*</span></Label>
                    <textarea
                      id="desc"
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
                      placeholder="E.g. My kitchen sink is leaking under the cabinet. I need someone to fix the P-trap and check for any water damage..."
                      value={form.job_description}
                      onChange={(e) => set('job_description', e.target.value)}
                    />
                    <p className={`text-xs ${form.job_description.length < 20 ? 'text-slate-400' : 'text-emerald-600'}`}>
                      {form.job_description.length}/20 characters minimum
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>How soon do you need this? <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {URGENCY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => set('urgency', opt.value)}
                          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                            form.urgency === opt.value
                              ? opt.color + ' border-2'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {step === 3 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">Where is the job?</h2>
                </div>
                <p className="text-sm text-slate-500 mb-5">
                  We use your location to match you with nearby pros.
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="zipcode">ZIP Code <span className="text-red-500">*</span></Label>
                    <Input
                      id="zipcode"
                      placeholder="e.g. 90210"
                      maxLength={10}
                      value={form.location_zipcode}
                      onChange={(e) => set('location_zipcode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City <span className="text-slate-400 text-xs font-normal">(optional)</span></Label>
                    <Input
                      id="city"
                      placeholder="e.g. Los Angeles, CA"
                      value={form.location_city}
                      onChange={(e) => set('location_city', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Contact Info */}
            {step === 4 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">Your contact info</h2>
                </div>
                <p className="text-sm text-slate-500 mb-5">
                  Pros will reach out with quotes. We never share your info publicly.
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      placeholder="Jane Smith"
                      value={form.contact_name}
                      onChange={(e) => set('contact_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@example.com"
                      value={form.contact_email}
                      onChange={(e) => set('contact_email', e.target.value)}
                    />
                    <p className="text-xs text-slate-400">We'll send quote responses to this address.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone <span className="text-slate-400 text-xs font-normal">(optional)</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 555 000 0000"
                      value={form.contact_phone}
                      onChange={(e) => set('contact_phone', e.target.value)}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm space-y-1.5">
                  <p className="font-semibold text-slate-700 mb-2">Your Request Summary</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service</span>
                    <span className="font-medium text-slate-800">{form.service_category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Urgency</span>
                    <span className="font-medium text-slate-800">
                      {URGENCY_OPTIONS.find((u) => u.value === form.urgency)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-800">
                      {form.location_city ? `${form.location_city} ` : ''}{form.location_zipcode}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={!canAdvance()}
                  className="gap-1"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canAdvance() || submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Request
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            By submitting, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-slate-600">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="underline hover:text-slate-600">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <RequestPageContent />
    </Suspense>
  );
}
