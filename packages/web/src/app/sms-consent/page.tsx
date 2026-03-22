import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata = {
  title: 'SMS Consent | HandyCall',
  description: 'HandyCall SMS opt-in disclosure and consent documentation for the Appointment SMS program.',
};

export default function SmsConsentPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12">
        <div className="space-y-8">
          <section className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">SMS Consent &amp; Opt-In Disclosure</h1>
            <p className="text-sm text-slate-600">
              This page documents how customers opt in to receive transactional appointment text messages sent
              through the <strong>HandyCall Appointment SMS</strong> program. This page is provided for regulatory
              compliance purposes (TCPA / CTIA / TCR A2P 10DLC).
            </p>
          </section>

          {/* Program Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Program Details</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
              <li><strong>Program name:</strong> HandyCall Appointment SMS</li>
              <li>
                <strong>Message types:</strong> Transactional only — appointment confirmations, reminders,
                reschedule/cancellation notices, booking links, and request status updates. No marketing or
                promotional messages are ever sent.
              </li>
              <li>
                <strong>Message frequency:</strong> Varies by appointment activity (typically 1–3 messages per
                appointment).
              </li>
              <li><strong>Cost:</strong> Msg &amp; data rates may apply.</li>
              <li><strong>Opt-out:</strong> Reply STOP to any message at any time.</li>
              <li><strong>Help:</strong> Reply HELP or email <Link href="mailto:hello@handycall.org" className="text-emerald-700 underline">hello@handycall.org</Link>.</li>
              <li>
                <strong>Data sharing:</strong> No mobile opt-in data or mobile phone numbers collected through
                this SMS program will be shared with or sold to third parties or affiliates for marketing or
                promotional purposes.
              </li>
              <li><strong>Condition of service:</strong> Consent is not required to receive service or book an appointment.</li>
            </ul>
          </section>

          {/* Web Opt-In (Primary) */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Opt-In Method: Web Booking Form</h2>
            <p className="text-sm text-slate-600">
              When a customer receives a personalized appointment booking link (e.g.,{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">https://handycall.org/book/[token]</code>
              ), they complete a booking form that includes a phone number field and an{' '}
              <strong>unchecked, standalone SMS consent checkbox</strong>. The checkbox must be actively checked
              by the customer before SMS messages are sent. Below is an exact replica of the consent element as
              it appears in the live booking form.
            </p>

            {/* Live mockup of the consent checkbox */}
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Consent checkbox as shown in the booking form
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-emerald-600"
                    aria-label="SMS consent example (display only)"
                  />
                  <span className="text-xs leading-relaxed text-slate-600">
                    I agree to receive appointment-related text messages from{' '}
                    <strong>HandyCall</strong> (confirmations, reminders, and updates). Message frequency varies.
                    Msg &amp; data rates may apply. Reply <strong>STOP</strong> to opt out,{' '}
                    <strong>HELP</strong> for help. Consent is not a condition of purchase.{' '}
                    <a
                      href="https://handycall.org/privacy-policy"
                      className="underline text-emerald-700"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>{' '}
                    |{' '}
                    <a
                      href="https://handycall.org/terms"
                      className="underline text-emerald-700"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms
                    </a>
                  </span>
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                The checkbox is unchecked by default. SMS is only sent when the customer actively checks this box.
                Consent is stored on the related contact record at the time of booking.
              </p>
            </div>

            <p className="text-sm text-slate-600">
              The public opt-in demo reviewers can access is{' '}
              <Link href="/book/demo" className="text-emerald-700 underline">
                https://handycall.org/book/demo
              </Link>
              . Personalized booking links (
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/book/[token]</code>) are unique
              per customer and appointment and are delivered via text or email by the contractor.
            </p>
          </section>

          {/* Phone Opt-In (Secondary) */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Opt-In Method: Verbal Consent During Phone Booking</h2>
            <p className="text-sm text-slate-600">
              HandyCall also powers AI-assisted phone answering for home service contractors. When a customer
              calls a HandyCall-powered business number and verbally agrees to book an appointment, the
              HandyCall agent reads the following verbal disclosure before collecting the mobile number:
            </p>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">Verbal disclosure script</p>
              <p className="text-sm text-slate-700 italic">
                &quot;To send you an appointment confirmation, we&apos;ll text the number you provide. Standard message
                and data rates may apply. You can reply STOP at any time to stop receiving texts. Do you agree to
                receive appointment text messages?&quot;
              </p>
            </div>
            <p className="text-sm text-slate-600">
              SMS messages are sent only after the customer gives explicit verbal affirmation. Consent is
              not a condition of service. Consent is logged at the time of booking and tied to the provided
              mobile number.
            </p>
          </section>

          {/* Sample Messages */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Sample Messages</h2>
            <p className="text-sm text-slate-500">All messages include STOP and HELP instructions.</p>
            <ul className="space-y-2">
              {[
                'HandyCall: Your appointment is confirmed for [Day, Date] at [Time]. Reply STOP to opt out, HELP for help. Msg & data rates may apply.',
                'HandyCall: Reminder — your appointment is tomorrow at [Time]. Reply STOP to opt out, HELP for help. Msg & data rates may apply.',
                'HandyCall: Your appointment has been rescheduled to [Day, Date] at [Time]. Reply STOP to opt out, HELP for help.',
                'HandyCall: Your appointment has been canceled. To request a new appointment visit https://handycall.org/request. Reply STOP to opt out, HELP for help.',
                'HandyCall: We received your appointment request and it is pending confirmation. Reply STOP to opt out, HELP for help.',
              ].map((msg, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {msg}
                </li>
              ))}
            </ul>
          </section>

          {/* Policy Links */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Policy Links</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>
                Privacy Policy:{' '}
                <Link href="/privacy-policy" className="text-emerald-700 underline">
                  https://handycall.org/privacy-policy
                </Link>
              </li>
              <li>
                Terms and Conditions:{' '}
                <Link href="/terms" className="text-emerald-700 underline">
                  https://handycall.org/terms
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
