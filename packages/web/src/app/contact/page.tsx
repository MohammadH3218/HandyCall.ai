'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SiteHeader } from '@/components/marketing/site-header';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12">
        <section className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary">Get in touch</Badge>
            <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Let’s talk about your phone line.</h1>
            <p className="text-lg text-muted-foreground">
              Whether you want to activate a plan, see a demo, or explore a custom setup, we’re ready to help. Tell us
              about your call volume and we’ll recommend the best fit.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: 'Response time', desc: 'We aim to reply within one business day.' },
                { title: 'Coverage', desc: 'US & Canada service businesses of all sizes.' },
                { title: 'Setup help', desc: 'Guided onboarding to connect your number and scripts.' },
                { title: 'Support', desc: 'Email + live onboarding sessions for new teams.' },
              ].map((item) => (
                <Card key={item.title} className="border-emerald-100 bg-white/80">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-sm font-semibold text-emerald-700">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">AI receptionist</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Call transcripts</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Bookings & SMS follow-up</span>
            </div>
          </div>

          <Card className="shadow-xl shadow-emerald-100">
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
                <p className="text-xs text-muted-foreground">
                  This form is a placeholder. We’ll wire it to your preferred channel when ready.
                </p>
              </form>
              <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                Prefer email? Reach us at{' '}
                <Link href="mailto:hello@handycall.org" className="font-semibold text-emerald-700 underline">
                  hello@handycall.org
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
