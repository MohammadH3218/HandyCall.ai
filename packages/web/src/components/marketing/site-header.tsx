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
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center">
          <Logo width={148} height={36} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/contact" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
            Contact
          </Link>
        </nav>

        {!hideLogin && (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden text-slate-600 hover:text-slate-900 md:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
