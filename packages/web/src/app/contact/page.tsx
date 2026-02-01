'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SiteHeader } from '@/components/marketing/site-header';

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
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/25 to-white text-foreground">
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
                <Card key={item.title} className="border-emerald-100 bg-white/85">
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
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Business name" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@business.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">How can we help?</Label>
                  <Textarea id="message" placeholder="Share your call volume, services, and goals." rows={4} />
                </div>
                <Button type="submit" className="w-full">
                  Send message
                </Button>
                <p className="text-xs text-slate-500">
                  This form is a placeholder. We can connect it to your preferred support channel.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
