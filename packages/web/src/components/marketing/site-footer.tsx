'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function SiteFooter() {
  return (
    <footer className="bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 border-b border-slate-800 pb-10">
          <Logo width={130} height={32} imageClassName="brightness-0 invert" />
          <p className="mt-3 max-w-md text-sm text-slate-400">
            Helping Riyadh homeowners discover the right service categories and helping pros turn that demand into booked work.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Find Services
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/search" className="text-sm text-slate-400 transition-colors hover:text-white">Search</Link></li>
              <li><Link href="/categories" className="text-sm text-slate-400 transition-colors hover:text-white">Categories</Link></li>
              <li><Link href="/#how-it-works" className="text-sm text-slate-400 transition-colors hover:text-white">How It Works</Link></li>
              <li><Link href="/signup" className="text-sm text-slate-400 transition-colors hover:text-white">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              For Pros
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/for-pros" className="text-sm text-slate-400 transition-colors hover:text-white">For Pros</Link></li>
              <li><Link href="/for-pros#pricing" className="text-sm text-slate-400 transition-colors hover:text-white">Pricing</Link></li>
              <li><Link href="/register" className="text-sm text-slate-400 transition-colors hover:text-white">Pro Sign Up</Link></li>
              <li><Link href="/pro/login" className="text-sm text-slate-400 transition-colors hover:text-white">Pro Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/contact" className="text-sm text-slate-400 transition-colors hover:text-white">Contact</Link></li>
              <li><Link href="mailto:hello@handycall.org" className="text-sm text-slate-400 transition-colors hover:text-white">hello@handycall.org</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/terms" className="text-sm text-slate-400 transition-colors hover:text-white">Terms</Link></li>
              <li><Link href="/privacy-policy" className="text-sm text-slate-400 transition-colors hover:text-white">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">© 2026 HandyCall. All rights reserved.</p>
          <p className="text-xs text-slate-600">Riyadh-focused marketplace</p>
        </div>
      </div>
    </footer>
  );
}
