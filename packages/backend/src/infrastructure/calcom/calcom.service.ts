import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CalcomSlot {
  time: string; // UTC ISO
}

export interface CalcomGetScheduleInput {
  startTime: string;
  endTime: string;
  eventTypeId?: number;
  eventTypeSlug?: string;
  usernameList?: string[];
  timeZone?: string;
  duration?: number;
  isTeamEvent?: boolean;
  orgSlug?: string | null;
}

export interface CalcomGetScheduleResult {
  slotsByDay: Record<string, CalcomSlot[]>;
}

export interface CalcomBookEventInput {
  eventTypeId: number;
  start: string;
  end: string;
  timeZone: string;
  language: string;
  responses: {
    name: string;
    email: string;
    notes?: string;
  };
  metadata: Record<string, any>;
  description?: string;
}

@Injectable()
export class CalcomService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get<string>('CALCOM_BASE_URL') || 'https://cal.handycall.org').replace(/\/+$/, '');
  }

  async getSchedule(input: CalcomGetScheduleInput): Promise<CalcomGetScheduleResult> {
    const url = new URL('/api/trpc/slots/getSchedule', this.baseUrl);
    url.searchParams.set('batch', '1');

    const trpcWrapper = {
      0: { json: input },
    };
    url.searchParams.set('input', JSON.stringify(trpcWrapper));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cal.com getSchedule failed (${res.status}): ${text.slice(0, 500)}`);
    }

    const payload = (await res.json()) as any[];
    const slots = payload?.[0]?.result?.data?.json?.slots;
    return {
      slotsByDay: (slots && typeof slots === 'object' ? slots : {}) as Record<string, CalcomSlot[]>,
    };
  }

  async bookEvent(input: CalcomBookEventInput): Promise<any> {
    const url = new URL('/api/book/event', this.baseUrl);
    const body = {
      eventTypeId: input.eventTypeId,
      start: input.start,
      end: input.end,
      timeZone: input.timeZone,
      language: input.language,
      responses: input.responses,
      metadata: input.metadata ?? {},
      ...(input.description ? { description: input.description } : {}),
    };

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cal.com bookEvent failed (${res.status}): ${text.slice(0, 800)}`);
    }

    return res.json();
  }
}

