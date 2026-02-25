'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ArrowRight, Clock, Rocket, Users, Headphones, CheckCircle2 } from 'lucide-react';

const points = [
  { icon: Clock, title: 'Fast response', desc: 'We usually respond within one business day for new inquiries.' },
  { icon: Rocket, title: 'Guided onboarding', desc: 'We help map your call flow, services, and availability so launch is smooth.' },
  { icon: Users, title: 'Service teams', desc: 'Built for companies handling high call volume and recurring scheduling.' },
  { icon: Headphones, title: 'Hands-on support', desc: 'Our team helps you tune scripts, routing, and follow-ups.' },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({ name: '', company: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange =
    (field: keyof typeof formState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16">
        <div className="mb-14 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Talk with our team</span>
          <h1 className="mt-3 text-[2.6rem] font-bold leading-[1.08] tracking-tight text-slate-900 md:text-5xl">
            Tell us about your phone line.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            Whether you&apos;re ready to activate a plan or want to see a demo, we can map the best setup for your
            service business.
          </p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          {/* ── Left: context ── */}
          <div className="space-y-6 lg:pt-2">
            <div className="space-y-3">
              {points.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                      <Icon className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-4">
              <p className="text-sm font-semibold text-emerald-900">Prefer email?</p>
              <p className="mt-0.5 text-sm text-emerald-700">
                Reach us at{' '}
                <Link href="mailto:hello@handycall.org" className="font-semibold underline">
                  hello@handycall.org
                </Link>
              </p>
            </div>
          </div>

          {/* ── Right: form ── */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-emerald-50/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
              {status === 'sent' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">Message received!</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Thanks for reaching out. We&apos;ll reply within one business day.
                  </p>
                  <Button className="mt-6 gap-2" onClick={() => setStatus('idle')}>
                    Send another message
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">Get in touch</h2>
                    <p className="mt-1 text-sm text-slate-500">We respond within one business day.</p>
                  </div>

                  {status === 'error' && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setStatus('sending');
                      setErrorMessage('');
                      try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(formState),
                        });
                        if (!response.ok) {
                          const data = await response.json().catch(() => ({}));
                          throw new Error(data?.message || 'Unable to send your message right now.');
                        }
                        setStatus('sent');
                        setFormState({ name: '', company: '', email: '', phone: '', message: '' });
                      } catch (err: any) {
                        setStatus('error');
                        setErrorMessage(err?.message || 'Unable to send your message right now.');
                      }
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Full name</Label>
                        <Input id="name" placeholder="Your name" required value={formState.name} onChange={handleChange('name')} className="h-11" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company" className="text-xs font-semibold text-slate-700">Company</Label>
                        <Input id="company" placeholder="Business name" required value={formState.company} onChange={handleChange('company')} className="h-11" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</Label>
                      <Input id="email" type="email" placeholder="you@business.com" required value={formState.email} onChange={handleChange('email')} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Phone <span className="font-normal text-slate-400">(optional)</span></Label>
                      <Input id="phone" type="tel" placeholder="(555) 123-4567" value={formState.phone} onChange={handleChange('phone')} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs font-semibold text-slate-700">How can we help?</Label>
                      <Textarea
                        id="message"
                        placeholder="Share your call volume, services, and goals — the more detail, the better we can help."
                        rows={4}
                        value={formState.message}
                        onChange={handleChange('message')}
                        className="resize-none"
                      />
                    </div>
                    <Button type="submit" className="h-11 w-full gap-2 text-sm" disabled={status === 'sending'}>
                      {status === 'sending' ? 'Sending…' : 'Send message'}
                      {status !== 'sending' && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
