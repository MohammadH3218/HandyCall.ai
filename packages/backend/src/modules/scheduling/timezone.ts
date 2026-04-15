export const SAUDI_TIMEZONE = 'Asia/Riyadh';

/** Format a Unix ms timestamp in Saudi Arabia Standard Time (UTC+3) */
export function formatSaudiTime(
  timestampMs: number,
  locale: 'ar-SA' | 'en-SA' = 'en-SA',
): string {
  return new Date(timestampMs).toLocaleString(locale, {
    timeZone: SAUDI_TIMEZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/** Get current time in Saudi timezone as a Date */
export function nowInSaudi(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SAUDI_TIMEZONE }));
}

/** Parse a date string assuming Saudi timezone */
export function parseSaudiDate(dateStr: string): Date {
  return new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: SAUDI_TIMEZONE }));
}

/**
 * Saudi working week: Saturday–Thursday (Friday is the weekend).
 * Returns true if the given day index (0=Sun…6=Sat) is a Saudi working day.
 */
export function isSaudiWorkingDay(dayIndex: number): boolean {
  return dayIndex !== 5; // 5 = Friday
}
