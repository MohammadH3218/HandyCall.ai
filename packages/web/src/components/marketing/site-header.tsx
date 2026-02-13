import Link from 'next/link';
import { Logo } from '../ui/logo';
import { Button } from '../ui/button';

type SiteHeaderProps = {
  ctaLabel?: string;
  ctaHref?: string;
  hideLogin?: boolean;
  hideLoginLink?: boolean;
};

export function SiteHeader({
  ctaLabel = 'Get started',
  ctaHref = '/register',
  hideLogin = false,
  hideLoginLink = false,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/90 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6 md:px-8">
        <Link href="/" className="flex items-center">
          <Logo width={134} height={32} />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </Link>
          <Link href="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>

        {!hideLogin ? (
          <div className="flex items-center gap-2">
            {!hideLoginLink ? (
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="primary">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}


