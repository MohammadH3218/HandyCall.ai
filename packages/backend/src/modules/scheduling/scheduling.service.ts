import { Injectable } from '@nestjs/common';
import { SAUDI_TIMEZONE } from './timezone';

@Injectable()
export class SchedulingService {
  /** Returns current server time in Saudi timezone */
  getCurrentSaudiTime(): string {
    return new Date().toLocaleString('ar-SA', { timeZone: SAUDI_TIMEZONE });
  }

  /** Validates that a scheduled_start timestamp is in the future */
  isFutureTime(timestampMs: number): boolean {
    return timestampMs > Date.now();
  }

  /** Validates that start < end */
  isValidWindow(startMs: number, endMs: number): boolean {
    return startMs < endMs;
  }
}
