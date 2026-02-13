import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Button } from '@/components/ui/button';

const faqItems = [
  {
    question: 'How quickly can we launch HandyCall?',
    answer:
      'Most teams launch in one day. Typical setup includes number routing, service rules, and a first booking workflow.',
  },
  {
    question: 'Can HandyCall transfer urgent calls to a person?',
    answer:
      'Yes. You can enable transfer rules for safety-sensitive or edge-case intents and route those calls to a live number.',
  },
  {
    question: 'Does HandyCall support SMS and appointment confirmations?',
    answer:
      'Yes. SMS threads and appointment confirmations are built in and remain linked to caller history.',
  },
  {
    question: 'How is security handled?',
    answer:
      'Webhook payloads are signed, dashboard access is role-based, and operational events are traceable for audits.',
  },
  {
    question: 'How are billing and overages calculated?',
    answer:
      'Plans include fixed weekly allowances. Extra usage is metered at published add-on rates and billed at period close.',
  },
  {
    question: 'What if we already have a phone number?',
    answer:
      'You can keep your existing number via forwarding or porting, depending on your telecom preference.',
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[920px] px-6 py-14">
        <h1 className="text-4xl font-semibold text-foreground">Frequently asked questions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Practical answers for rollout, operations, security, and billing.
        </p>

        <div className="mt-8 space-y-2">
          {faqItems.map((item) => (
            <details key={item.question} className="rounded-md border border-border bg-[#0f1115] p-4">
              <summary className="cursor-pointer text-sm font-medium text-foreground">{item.question}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/register">Start onboarding</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
