'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'dark';

const PUBLIC_THEME_KEY = 'handycall-theme:public';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const accountEmail = session?.user?.email?.trim().toLowerCase() || null;

  const getStorageKey = (email?: string | null) =>
    email ? `handycall-theme:${email}` : PUBLIC_THEME_KEY;

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    const isDark = t === 'dark';
    root.classList.toggle('dark', isDark);
    root.dataset.theme = isDark ? 'dark' : 'light';
    setResolvedTheme(isDark ? 'dark' : 'light');
  };

  const readStoredTheme = (email?: string | null): Theme => {
    // Public pages and new users always default to light
    if (!email) return 'light';

    const scopedKey = getStorageKey(email);
    const scoped = localStorage.getItem(scopedKey) as string | null;
    if (scoped === 'light' || scoped === 'dark') {
      return scoped;
    }

    // No saved preference for this user → always start in light mode
    return 'light';
  };

  useEffect(() => {
    const initial = readStoredTheme(accountEmail);
    setThemeState(initial);
    applyTheme(initial);
  }, [accountEmail]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(getStorageKey(accountEmail), t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
