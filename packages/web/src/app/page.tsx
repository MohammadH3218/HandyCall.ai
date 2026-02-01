import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/marketing/site-header';

const highlights = [
  { title: 'Instant call answering', desc: 'AI receptionist greets every caller 24/7 with your brand voice.' },
  { title: 'Lead capture and routing', desc: 'Collect caller info, qualify, and route to the right workflow in seconds.' },
  { title: 'Bookings that stick', desc: 'Secure appointment details and send confirmations automatically.' },
];

const steps = [
  { title: 'Connect your number', desc: 'Point your business line to HandyCall in minutes.' },
  { title: 'Teach your playbook', desc: 'Drop your FAQs, pricing rules, and scheduling rules.' },
  { title: 'Go live', desc: 'AI answers every call, captures leads, and books jobs around the clock.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12">
        <section className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6 animate-slide-in-left">
            <Badge className="bg-primary/10 text-primary">AI Receptionist for Service Pros</Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
              Never miss a call. Capture every lead. Book more jobs.
            </h1>
            <p className="text-lg text-muted-foreground">
              HandyCall answers every phone call with an AI receptionist trained on your business. It qualifies leads,
              books appointments, and sends follow-ups while you stay focused on the work.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Launch HandyCall</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                24/7 answering
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Real-time transcripts
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Automated follow-ups
              </div>
            </div>
          </div>
          <Card className="relative overflow-hidden border-0 shadow-xl shadow-emerald-100 animate-slide-in-right">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-transparent to-white" />
            <CardContent className="relative space-y-6 p-8">
              <div>
                <p className="text-sm font-medium text-emerald-600">How HandyCall works</p>
                <h3 className="mt-2 text-2xl font-semibold text-gray-900">A clean pipeline from call to booking</h3>
                <p className="mt-2 text-muted-foreground">
                  Your callers get a professional greeting, clear answers, and a confirmed appointment without waiting
                  on hold.
                </p>
              </div>
              <div className="space-y-4">
                {highlights.map((item) => (
                  <div key={item.title} className="rounded-lg border border-emerald-100 bg-white/70 p-4 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Response time</p>
                  <p className="text-xl font-semibold text-gray-900">~2 seconds</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Lead capture rate</p>
                  <p className="text-xl font-semibold text-gray-900">98%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-24 space-y-10">
          <div className="flex flex-col gap-3 text-center">
            <Badge className="mx-auto bg-emerald-100 text-emerald-700">Built for field service teams</Badge>
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Everything your phone line should do</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              HandyCall keeps your line open, your calendar full, and your customers informed with zero manual effort.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Call handling that feels human',
                desc: 'Natural voice, accurate intent detection, and polite responses tuned to your brand.',
              },
              {
                title: 'Appointments without back-and-forth',
                desc: 'Book jobs based on your rules and hours, send confirmations, and capture all details.',
              },
              {
                title: 'Follow-ups that convert',
                desc: 'Automatic reminders and replies so leads never slip through the cracks.',
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="border-emerald-100 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <CardContent className="space-y-2 p-6">
                  <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-10 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-10 shadow-inner md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.title} className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-semibold text-emerald-600 shadow">
                {idx + 1}
              </div>
              <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
              <p className="text-sm text-emerald-800/80">{step.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 rounded-2xl border border-emerald-100 bg-white/80 p-10 text-center shadow-lg shadow-emerald-50">
          <div className="mx-auto max-w-2xl space-y-4">
            <h3 className="text-3xl font-bold text-gray-900">Ready to capture every call?</h3>
            <p className="text-muted-foreground">
              Start with HandyCall and give every caller a professional, on-brand experience day or night.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
