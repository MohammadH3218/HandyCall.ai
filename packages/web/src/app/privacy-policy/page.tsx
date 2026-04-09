'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Privacy Policy</h1>
            <p className="text-sm text-slate-500">Last updated: February 9, 2026</p>
          </div>

          <section className="space-y-3 text-sm text-slate-600">
            <p>
              This Privacy Policy explains how HandyCall (“HandyCall,” “we,” “us,” or “our”) collects, uses, and
              protects information when you visit handycall.org or use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Information We Collect</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>Contact details: name, email, phone number, and company name.</li>
              <li>Account and billing details when you sign up for a plan.</li>
              <li>Call and messaging data you choose to process through HandyCall.</li>
              <li>Usage data and device information for security and performance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">How We Use Information</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>Provide and improve HandyCall services.</li>
              <li>Deliver customer support and operational notifications.</li>
              <li>Maintain security, prevent abuse, and comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Communications</h2>
            <p className="text-sm text-slate-600">
              We may send transactional emails and account notices related to bookings, account activity, billing,
              and product operations. These communications are used to deliver the service and keep your account up to date.
            </p>
            <p className="text-sm text-slate-600">
              If you have questions about account communications, contact us at{' '}
              <Link href="mailto:hello@handycall.org" className="text-emerald-700 underline">
                hello@handycall.org
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Data Sharing</h2>
            <p className="text-sm text-slate-600">
              We do not sell your personal information. We share data only with service providers (subcontractors)
              needed to operate HandyCall (such as hosting, analytics, and communications) or when required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Data Retention</h2>
            <p className="text-sm text-slate-600">
              We retain data only as long as needed to provide services, meet legal requirements, or resolve disputes.
              You can request deletion by contacting support.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Your Choices</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>Request access, correction, or deletion of your data.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="text-sm text-slate-600">
              Questions about this policy? Email{' '}
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
