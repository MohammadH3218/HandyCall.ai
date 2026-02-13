import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Logo width={120} height={30} />
          <span className="text-xs text-muted-foreground">(c) 2026 HandyCall. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
          <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="mailto:hello@handycall.org" className="transition-colors hover:text-foreground">
            hello@handycall.org
          </Link>
        </div>
      </div>
    </footer>
  );
}


