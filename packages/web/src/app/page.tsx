import Link from 'next/link';
import { ArrowRight, CalendarClock, MessageSquareText, PhoneCall, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';

const trustChips = ['Real-time booking', 'Spam reduction', 'After-hours coverage', 'SLA-focused routing'];

const features = [
  {
    icon: PhoneCall,
    title: 'Reliable call intake',
    description: 'Every inbound call is answered with structured qualification and clear escalation rules.',
  },
  {
    icon: MessageSquareText,
    title: 'Unified message handoff',
    description: 'SMS context stays linked to calls and appointments so your team never loses thread state.',
  },
  {
    icon: CalendarClock,
    title: 'Scheduling controls',
    description: 'Bookings are aligned to availability, business hours, and service-area constraints.',
  },
  {
    icon: ShieldCheck,
    title: 'Operational security',
    description: 'Event signing, role-aware routing, and auditable logs are built in from day one.',
  },
];

const howItWorks = [
  {
    title: 'Connect number + calendar',
    description: 'Bring your existing line and scheduling source. No script rewrites required.',
  },
  {
    title: 'Set guardrails',
    description: 'Define service rules, handoff thresholds, and confirmation behavior.',
  },
  {
    title: 'Go live in one day',
    description: 'Start routing calls, capturing leads, and booking jobs with full visibility.',
  },
];

const tiers = [
  {
    name: 'Starter',
    price: '$4.99',
    cadence: '/week',
    points: ['50 min call handling', '100 SMS', 'Lead capture + basic routing'],
  },
  {
    name: 'Pro',
    price: '$9.99',
    cadence: '/week',
    points: ['120 min call handling', '250 SMS', 'Bookings + transcript workflow'],
    highlight: true,
  },
  {
    name: 'Max',
    price: '$19.99',
    cadence: '/week',
    points: ['250 min call handling', '500 SMS', 'Priority support + integrations'],
  },
];

const faqs = [
  {
    question: 'How does HandyCall handle after-hours calls?',
    answer: 'You can route after-hours calls to AI, voicemail, or human transfer using explicit call-handling rules.',
  },
  {
    question: 'Can we keep our existing number?',
    answer: 'Yes. You can forward your current line or port it based on your operational preference.',
  },
  {
    question: 'What about security and privacy?',
    answer: 'Webhook events are signed, data access is role-aware, and operational logs are retained for audit review.',
  },
  {
    question: 'Do we need custom engineering support to launch?',
    answer: 'Most teams launch with default templates. Advanced integrations can be added progressively.',
  },
];

function ProductMock() {
  return (
    <div className="rounded-xl border border-border bg-[#0f1115] p-4 shadow-2">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md border border-border bg-[#13161b] p-3">
          <p className="text-text-faint">Calls</p>
          <p className="mt-1 text-lg font-semibold text-foreground">34</p>
          <p className="text-muted-foreground">8 booked  -  5 missed</p>
        </div>
        <div className="rounded-md border border-border bg-[#13161b] p-3">
          <p className="text-text-faint">Messages</p>
          <p className="mt-1 text-lg font-semibold text-foreground">19</p>
          <p className="text-muted-foreground">3 awaiting response</p>
        </div>
        <div className="rounded-md border border-border bg-[#13161b] p-3">
          <p className="text-text-faint">Appointments</p>
          <p className="mt-1 text-lg font-semibold text-foreground">12</p>
          <p className="text-muted-foreground">Today + next 24h</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-md border border-border bg-[#13161b] p-3 text-xs">
        <p className="font-semibold text-foreground">Live call summary</p>
        <p className="text-muted-foreground">Caller: +1 (415) 555-0199  -  Service: AC Repair  -  Outcome: Booked Thu 3:30 PM</p>
        <div className="rounded border border-primary/35 bg-primary/12 px-2 py-1 text-[#cbe8ff]">Confirmation SMS sent + contact updated</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="border-b border-border">
          <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <Badge variant="secondary" className="w-fit">AI receptionist for service teams</Badge>
              <h1 className="max-w-[560px] text-4xl font-semibold leading-tight text-foreground md:text-5xl">
                Quiet operations. Consistent bookings. No missed calls.
              </h1>
              <p className="max-w-[540px] text-base text-muted-foreground">
                HandyCall answers calls, qualifies requests, and books jobs with clear guardrails. Your team stays on work, not call triage.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="lg">
                  <Link href="/register">
                    Start free onboarding
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
            </div>
            <ProductMock />
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-6 py-8">
            <p className="mr-3 text-xs uppercase tracking-[0.08em] text-text-faint">Built for</p>
            {trustChips.map((chip) => (
              <span key={chip} className="rounded-full border border-border bg-[#0f1115] px-3 py-1 text-xs text-muted-foreground">
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-14">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground">Core capabilities</h2>
              <p className="mt-2 max-w-[620px] text-sm text-muted-foreground">
                Designed as a practical operations layer, not a novelty UI. Everything centers on clear outcomes and routing confidence.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-lg border border-border bg-[#0f1115] p-4">
                    <Icon className="h-4 w-4 text-text-muted" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{feature.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-5 rounded-lg border border-border bg-[#0f1115] p-5 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-text-faint">Highlight</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">Unified call → message → booking timeline</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review a caller journey end-to-end without jumping between tools. Status chips, transcripts, and schedule actions stay synchronized.
                </p>
              </div>
              <div className="rounded-md border border-border bg-[#13161b] p-4 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Demo timeline</p>
                <p className="mt-2">09:14  -  Incoming call qualified</p>
                <p>09:16  -  SMS follow-up sent</p>
                <p>09:18  -  Appointment booked</p>
                <p>09:19  -  Confirmation delivered</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-14">
            <h2 className="text-2xl font-semibold text-foreground">How it works</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {howItWorks.map((step, index) => (
                <div key={step.title} className="rounded-lg border border-border bg-[#0f1115] p-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Pricing</h2>
                <p className="mt-2 text-sm text-muted-foreground">Three tiers, predictable weekly billing, and usage-based add-ons when needed.</p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/pricing">Full comparison</Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-lg border p-4 ${tier.highlight ? 'border-primary/45 bg-primary/12' : 'border-border bg-[#0f1115]'}`}
                >
                  {tier.highlight ? (
                    <Badge variant="info" className="mb-2 w-fit">Recommended</Badge>
                  ) : null}
                  <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {tier.price}
                    <span className="text-sm font-medium text-muted-foreground">{tier.cadence}</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {tier.points.map((point) => (
                      <li key={point}> -  {point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-14">
            <div className="mb-5 flex items-center gap-2">
              <Zap className="h-4 w-4 text-text-muted" />
              <h2 className="text-2xl font-semibold text-foreground">FAQ</h2>
            </div>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details key={faq.question} className="rounded-md border border-border bg-[#0f1115] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">{faq.question}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-5">
              <Button asChild variant="secondary" size="sm">
                <Link href="/faq">See full FAQ</Link>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-14">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Ready to stabilize your call flow?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Launch a production-ready receptionist workflow in one rollout window.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/register">Start now</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/contact">Talk to sales</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

