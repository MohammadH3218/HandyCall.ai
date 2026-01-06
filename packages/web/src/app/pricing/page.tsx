import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/marketing/site-header';

const plans = [
  {
    name: 'Starter',
    price: '$9.99',
    cadence: 'per week',
    limits: ['50 minutes/week', '100 SMS/week', '200 contacts/week'],
    bestFor: 'Solo operators getting started with AI answering.',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19.99',
    cadence: 'per week',
    limits: ['120 minutes/week', '250 SMS/week', '500 contacts/week'],
    bestFor: 'Growing teams that want consistent coverage and bookings.',
    highlight: true,
  },
  {
    name: 'Max',
    price: '$39.99',
    cadence: 'per week',
    limits: ['250 minutes/week', '500 SMS/week', '1000 contacts/week'],
    bestFor: 'Busy crews that need higher weekly volume and follow-ups.',
    highlight: false,
  },
];

const inclusions = [
  'AI receptionist with your brand voice',
  'Real-time call summaries and transcripts',
  'Lead capture and qualification',
  'Smart appointment booking',
  'Automated SMS confirmations and reminders',
  'Call recordings and analytics dashboard',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12">
        <section className="space-y-6 text-center">
          <Badge className="mx-auto bg-primary/10 text-primary">Weekly plans built for service teams</Badge>
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Pick the plan that fits your call volume.</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Straightforward pricing. Contact us to activate your subscription and we’ll tailor the setup for your team.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/contact">Talk to sales</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Existing customer? Log in</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex h-full flex-col border-emerald-100 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                plan.highlight ? 'bg-white shadow-lg shadow-emerald-100' : 'bg-white/80'
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-2xl">
                  {plan.name}
                  {plan.highlight && <Badge className="bg-emerald-100 text-emerald-700">Most popular</Badge>}
                </CardTitle>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.bestFor}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.limits.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {item}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link href="/contact">Contact to buy</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>

        <section className="mt-16 rounded-2xl border border-emerald-100 bg-white/80 p-8 shadow-inner">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-900">Every plan includes</h2>
              <p className="text-muted-foreground">
                We keep it simple: the same AI quality and reception experience across all tiers. Increase limits as you
                grow.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {inclusions.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-10 text-center shadow-lg shadow-emerald-50">
          <h3 className="text-2xl font-bold text-gray-900">Want a custom package?</h3>
          <p className="mt-2 text-muted-foreground">
            Need more minutes or dedicated onboarding? Tell us what you need and we’ll tailor a plan.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="lg" variant="secondary" className="bg-white text-emerald-700 shadow">
              <Link href="/contact">Start the conversation</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
