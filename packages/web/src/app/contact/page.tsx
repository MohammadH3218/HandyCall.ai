import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  IconArrowRight,
  IconBriefcase,
  IconHome,
  IconMail,
  IconMapPin,
  IconMessageCircle,
  IconShieldCheck,
} from '@tabler/icons-react';

const contactCards = [
  {
    title: 'Customers',
    eyebrow: 'Booking help, account questions, and service requests',
    email: 'hello@handycall.org',
    href: 'mailto:hello@handycall.org',
    icon: IconHome,
    body: 'For help finding a Riyadh pro, questions about a posted job, account access, or anything related to a customer request.',
    cta: 'Email customer support',
  },
  {
    title: 'Pros',
    eyebrow: 'Applications, profiles, leads, billing, and marketplace support',
    email: 'hello.pro@handycall.org',
    href: 'mailto:hello.pro@handycall.org',
    icon: IconBriefcase,
    body: 'For provider onboarding, profile approvals, service categories, lead fees, billing questions, or help with your pro dashboard.',
    cta: 'Email pro support',
  },
];

const supportNotes = [
  {
    icon: IconMapPin,
    title: 'Riyadh-first support',
    text: 'Tell us your district, service category, and any request ID when you have one. It helps us route the question quickly.',
  },
  {
    icon: IconShieldCheck,
    title: 'Privacy-conscious',
    text: 'Do not send passwords, OTP codes, card details, or private documents by email. We will never ask for them there.',
  },
  {
    icon: IconMessageCircle,
    title: 'Clear next steps',
    text: 'Most messages get a practical reply: what happened, who owns the next step, and what we need from you.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main>
        <section className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/70">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700">
                Contact HandyCall
              </span>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
                The right inbox for the right kind of help.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">
                Customers and service pros need different support. Use the inbox below that matches
                your role, and include the service, district, and request details when relevant.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid gap-5 md:grid-cols-2">
            {contactCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.email}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Icon className="h-6 w-6" stroke={1.7} />
                    </div>
                    <IconMail className="h-5 w-5 text-slate-300" stroke={1.7} />
                  </div>

                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-700">
                    {card.title}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">{card.email}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">{card.eyebrow}</p>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">{card.body}</p>

                  <Link
                    href={card.href}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {card.cta}
                    <IconArrowRight className="h-4 w-4" stroke={2} />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {supportNotes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <Icon className="h-5 w-5 text-emerald-600" stroke={1.7} />
                  <h3 className="mt-4 text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Looking for a pro instead of support?
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Search Riyadh services or post a custom job request if you cannot find the right
                  match.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Find services
                </Link>
                <Link
                  href="/customer/dashboard/post-job"
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Post a job
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
