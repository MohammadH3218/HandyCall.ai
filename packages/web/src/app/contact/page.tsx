'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

const points = [
  {
    title: 'Fast response',
    desc: 'We usually respond within one business day for new inquiries.',
  },
  {
    title: 'Guided onboarding',
    desc: 'We help map your call flow, services, and availability so launch is smooth.',
  },
  {
    title: 'Service teams',
    desc: 'Built for companies handling high call volume and recurring scheduling.',
  },
  {
    title: 'Hands-on support',
    desc: 'Our team helps you tune scripts, routing, and follow-ups.',
  },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange =
    (field: keyof typeof formState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-emerald-50/25 to-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12">
        <section className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Badge className="bg-emerald-100 text-emerald-700">Talk with our team</Badge>
            <h1 className="text-4xl font-display text-slate-900 md:text-5xl">Tell us about your phone line.</h1>
            <p className="text-lg text-slate-600">
              Whether you are ready to activate a plan or want to see a demo, we can map the best setup for your
              service business.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {points.map((item) => (
                <Card key={item.title} className="border-emerald-100 bg-card/85">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-sm font-semibold text-emerald-700">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-sm text-emerald-900">
              Prefer email? Reach us at{' '}
              <Link href="mailto:hello@handycall.org" className="font-semibold text-emerald-700 underline">
                hello@handycall.org
              </Link>
              .
            </div>
          </div>

          <Card className="shadow-xl shadow-emerald-100 border-emerald-100">
            <CardHeader>
              <CardTitle>Contact us</CardTitle>
            </CardHeader>
            <CardContent>
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
                    setFormState({
                      name: '',
                      company: '',
                      email: '',
                      phone: '',
                      message: '',
                    });
                  } catch (err: any) {
                    setStatus('error');
                    setErrorMessage(err?.message || 'Unable to send your message right now.');
                  }
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" placeholder="Your name" required value={formState.name} onChange={handleChange('name')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Business name" required value={formState.company} onChange={handleChange('company')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@business.com" required value={formState.email} onChange={handleChange('email')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" value={formState.phone} onChange={handleChange('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">How can we help?</Label>
                  <Textarea
                    id="message"
                    placeholder="Share your call volume, services, and goals."
                    rows={4}
                    value={formState.message}
                    onChange={handleChange('message')}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending...' : 'Send message'}
                </Button>
                {status === 'sent' ? (
                  <p className="text-xs text-emerald-700">Thanks! We received your message and will reply soon.</p>
                ) : null}
                {status === 'error' ? (
                  <p className="text-xs text-red-600">{errorMessage}</p>
                ) : (
                  <p className="text-xs text-slate-500">We typically respond within one business day.</p>
                )}
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
