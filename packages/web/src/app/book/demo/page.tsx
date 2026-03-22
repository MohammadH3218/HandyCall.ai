import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata = {
  title: 'Booking Opt-In Demo | HandyCall',
  description: 'Public demo of the HandyCall booking form SMS consent checkbox and disclosure.',
};

export default function BookingOptInDemoPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12">
        <div className="space-y-6">
          <section className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Public Booking Opt-In Demo</h1>
            <p className="text-sm text-slate-600">
              This page is a public demonstration of the SMS consent element shown in HandyCall booking links.
              It is provided so Twilio and compliance reviewers can verify the opt-in disclosure exactly where a
              customer provides a mobile number.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Demo only. This page does not submit a live appointment.
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900" htmlFor="demo-name">
                    Full Name
                  </label>
                  <input
                    id="demo-name"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none"
                    placeholder="Jane Customer"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900" htmlFor="demo-phone">
                    Mobile Number
                  </label>
                  <input
                    id="demo-phone"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none"
                    placeholder="(555) 123-4567"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900" htmlFor="demo-date">
                    Preferred Date
                  </label>
                  <input
                    id="demo-date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none"
                    value="2026-03-20"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900" htmlFor="demo-time">
                    Preferred Time
                  </label>
                  <input
                    id="demo-time"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none"
                    value="10:00"
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    readOnly
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-emerald-600"
                    aria-label="SMS consent demo checkbox"
                  />
                  <span className="text-xs leading-relaxed text-slate-600">
                    I agree to receive appointment-related text messages from <strong>HandyCall</strong>
                    {' '} (confirmations, reminders, and updates). Message frequency varies. Msg and data rates may
                    apply. Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help. Consent is not a
                    condition of purchase.{' '}
                    <Link href="/privacy-policy" className="text-emerald-700 underline">
                      Privacy Policy
                    </Link>{' '}
                    |{' '}
                    <Link href="/terms" className="text-emerald-700 underline">
                      Terms
                    </Link>
                  </span>
                </label>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
