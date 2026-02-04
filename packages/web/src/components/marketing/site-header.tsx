import Link from 'next/link';
import { Logo } from '../ui/logo';
import { Button } from '../ui/button';

type SiteHeaderProps = {
  ctaLabel?: string;
  ctaHref?: string;
  hideLogin?: boolean;
};

export function SiteHeader({
  ctaLabel = 'Get started',
  ctaHref = '/register',
  hideLogin = false,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-emerald-100/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo width={160} height={40} />
        </Link>
        <nav className="hidden items-center gap-6 rounded-full border border-emerald-100 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm md:flex">
          <Link href="/pricing" className="transition-colors hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/contact" className="transition-colors hover:text-slate-900">
            Contact
          </Link>
          {!hideLogin && (
            <Link href="/login" className="transition-colors hover:text-slate-900">
              Login
            </Link>
          )}
        </nav>
        {!hideLogin && (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="md:hidden">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            <Button asChild className="hidden md:inline-flex">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
