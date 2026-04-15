'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Terms and Conditions</h1>
            <p className="text-sm text-slate-500">Last updated: February 9, 2026</p>
          </div>

          <section className="space-y-3 text-sm text-slate-600">
            <p>
              These Terms and Conditions (“Terms”) govern your access to and use of HandyCall services and the
              handycall.org website. By using HandyCall, you agree to these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Services</h2>
            <p className="text-sm text-slate-600">
              HandyCall provides AI-powered call handling, appointment scheduling, and messaging tools for service
              businesses. Service availability may vary by plan and location.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Account Responsibilities</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>You are responsible for maintaining accurate business information.</li>
              <li>You are responsible for complying with applicable laws and regulations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Communications</h2>
            <p className="text-sm text-slate-600">
              HandyCall may send transactional emails and account notices related to account activity, billing,
              bookings, and service operations. You are responsible for keeping your account contact details current.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Billing</h2>
            <p className="text-sm text-slate-600">
              Plans are billed according to your subscription terms. You may cancel anytime; access continues until
              the end of the billing period unless otherwise stated.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Acceptable Use</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>No spam, promotional messaging without explicit consent, or unlawful use.</li>
              <li>No attempts to interfere with or abuse the platform.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Disclaimer</h2>
            <p className="text-sm text-slate-600">
              HandyCall is provided “as is.” We do not guarantee uninterrupted availability or error-free operation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="text-sm text-slate-600">
              Questions about these Terms? Email{' '}
              <Link href="mailto:hello@handycall.org" className="text-emerald-700 underline">
                hello@handycall.org
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
