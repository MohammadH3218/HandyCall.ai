import { Injectable } from '@nestjs/common';

/** Timezone utilities for Saudi Arabia (Asia/Riyadh, UTC+3) */
@Injectable()
export class SchedulingService {
  readonly defaultTimezone = 'Asia/Riyadh';

  /** Format a Unix ms timestamp to a human-readable Saudi time string */
  formatSaudiTime(timestampMs: number, lang: 'ar' | 'en' = 'en'): string {
    return new Date(timestampMs).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-SA', {
      timeZone: this.defaultTimezone,
    });
  }

  /** Get current time in Riyadh */
  nowInRiyadh(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: this.defaultTimezone }));
  }
}
