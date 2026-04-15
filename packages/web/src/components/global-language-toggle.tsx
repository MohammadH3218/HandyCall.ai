'use client';

import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';

export function GlobalLanguageToggle() {
  const pathname = usePathname();

  const isAdminShell = pathname?.startsWith('/admin') && pathname !== '/admin/login';
  const hiddenShells = ['/dashboard', '/customer/dashboard', '/onboarding'];
  const isHidden = isAdminShell || hiddenShells.some((path) => pathname?.startsWith(path));

  if (isHidden) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-[70]">
      <LanguageSwitcher />
    </div>
  );
}
