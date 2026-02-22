import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { ParameterStoreService } from '../../infrastructure/config/parameter-store.service';
import { createSign } from 'crypto';
import * as http2 from 'http2';
import { v4 as uuidv4 } from 'uuid';
import {
  NOTIFICATION_EVENT_KEYS,
  NotificationCategory,
  NotificationDevice,
  NotificationDeviceRegistration,
  NotificationEventKey,
  NotificationItem,
  NotificationPreferences,
  NotificationPreferencesMap,
  SubscriptionPlan,
} from '@handycall/shared';
import type { WebhookEventType } from '../webhooks/webhooks.types';

type EventCatalogItem = {
  event_key: NotificationEventKey;
  label: string;
  category: NotificationCategory;
  description: string;
};

const EVENT_CATALOG: Record<NotificationEventKey, EventCatalogItem> = {
  appointment_created: {
    event_key: 'appointment_created',
    label: 'New appointment',
    category: 'APPOINTMENTS',
    description: 'Sent when a new appointment is created.',
  },
  appointment_updated: {
    event_key: 'appointment_updated',
    label: 'Appointment updated',
    category: 'APPOINTMENTS',
    description: 'Sent when an existing appointment is updated or rescheduled.',
  },
  appointment_cancelled: {
    event_key: 'appointment_cancelled',
    label: 'Appointment cancelled',
    category: 'APPOINTMENTS',
    description: 'Sent when an appointment is cancelled.',
  },
  call_completed: {
    event_key: 'call_completed',
    label: 'New call',
    category: 'CALLS',
    description: 'Sent when a call is completed and saved.',
  },
  lead_created: {
    event_key: 'lead_created',
    label: 'New lead',
    category: 'LEADS',
    description: 'Sent when a new contact/lead is created.',
  },
  usage_threshold_25: {
    event_key: 'usage_threshold_25',
    label: 'Usage 25%',
    category: 'USAGE',
    description: 'Sent when usage reaches 25% for a tracked limit.',
  },
  usage_threshold_50: {
    event_key: 'usage_threshold_50',
    label: 'Usage 50%',
    category: 'USAGE',
    description: 'Sent when usage reaches 50% for a tracked limit.',
  },
  usage_threshold_75: {
    event_key: 'usage_threshold_75',
    label: 'Usage 75%',
    category: 'USAGE',
    description: 'Sent when usage reaches 75% for a tracked limit.',
  },
  usage_threshold_90: {
    event_key: 'usage_threshold_90',
    label: 'Usage 90%',
    category: 'USAGE',
    description: 'Sent when usage reaches 90% for a tracked limit.',
  },
  usage_threshold_100: {
    event_key: 'usage_threshold_100',
    label: 'Usage limit reached',
    category: 'USAGE',
    description: 'Sent when usage reaches or exceeds 100%.',
  },
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesMap = {
  appointment_created: { in_app: true, push: true },
  appointment_updated: { in_app: true, push: true },
  appointment_cancelled: { in_app: true, push: true },
  call_completed: { in_app: true, push: true },
  lead_created: { in_app: true, push: true },
  usage_threshold_25: { in_app: true, push: false },
  usage_threshold_50: { in_app: true, push: false },
  usage_threshold_75: { in_app: true, push: true },
  usage_threshold_90: { in_app: true, push: true },
  usage_threshold_100: { in_app: true, push: true },
};

const PLAN_LIMITS: Record<SubscriptionPlan, { minutes: number; sms: number; contacts: number }> = {
  [SubscriptionPlan.STARTER]: { minutes: 50, sms: 100, contacts: 200 },
  [SubscriptionPlan.PRO]: { minutes: 120, sms: 250, contacts: 500 },
  [SubscriptionPlan.MAX]: { minutes: 250, sms: 500, contacts: 1000 },
};

@Injectable()
export class NotificationsService {
  private apnsTokenCache: { jwt: string; expiresAt: number } | null = null;
  private apnsConfigCache:
    | {
        config: { keyId: string; teamId: string; bundleId: string; privateKey: string } | null;
        expiresAt: number;
      }
    | null = null;

  constructor(
    private readonly dynamodb: DynamoDBService,
    private readonly config: ConfigService,
    private readonly parameterStore: ParameterStoreService,
  ) {}

  listEvents(): EventCatalogItem[] {
    return NOTIFICATION_EVENT_KEYS.map((key) => EVENT_CATALOG[key]);
  }

  async getPreferences(companyId: string, userId: string): Promise<NotificationPreferences> {
    const existing = await this.dynamodb.get('notification_preferences', {
      company_id: companyId,
      user_id: userId,
    });

    if (!existing) {
      const now = Date.now();
      return {
        company_id: companyId,
        user_id: userId,
        preferences: this.defaultPreferences(),
        created_at: now,
        updated_at: now,
      };
    }

    const stored = this.normalizePreferences(existing.preferences || {});
    return {
      company_id: companyId,
      user_id: userId,
      preferences: stored,
      created_at: Number(existing.created_at || Date.now()),
      updated_at: Number(existing.updated_at || Date.now()),
    };
  }

  async updatePreferences(
    companyId: string,
    userId: string,
    input: Partial<NotificationPreferencesMap>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(companyId, userId);
    const merged = this.defaultPreferences();

    for (const eventKey of NOTIFICATION_EVENT_KEYS) {
      merged[eventKey] = { ...current.preferences[eventKey] };
    }

    for (const eventKey of NOTIFICATION_EVENT_KEYS) {
      const patch = input?.[eventKey];
      if (!patch || typeof patch !== 'object') continue;
      const next = merged[eventKey];
      if (typeof patch.in_app === 'boolean') next.in_app = patch.in_app;
      if (typeof patch.push === 'boolean') next.push = patch.push;
      merged[eventKey] = next;
    }

    const now = Date.now();
    const payload: NotificationPreferences = {
      company_id: companyId,
      user_id: userId,
      preferences: merged,
      created_at: current.created_at || now,
      updated_at: now,
    };

    await this.dynamodb.put('notification_preferences', payload as any);
    return payload;
  }

  async listNotifications(
    companyId: string,
    userId: string,
    options?: { limit?: number; lastEvaluatedKey?: any; unreadOnly?: boolean },
  ): Promise<{ notifications: NotificationItem[]; lastEvaluatedKey?: any }> {
    const limit = Math.min(Math.max(Number(options?.limit || 25), 1), 100);
    const companyUser = `${companyId}#${userId}`;

    const names: Record<string, string> = {
      '#company_user': 'company_user',
      ...(options?.unreadOnly ? { '#is_read': 'is_read' } : {}),
    };
    const values: Record<string, any> = {
      ':company_user': companyUser,
      ...(options?.unreadOnly ? { ':is_read': false } : {}),
    };

    try {
      const result = await this.dynamodb.query(
        'notifications',
        '#company_user = :company_user',
        names,
        values,
        {
          indexName: 'recipient-index',
          limit,
          scanIndexForward: false,
          exclusiveStartKey: options?.lastEvaluatedKey,
          filterExpression: options?.unreadOnly ? '#is_read = :is_read' : undefined,
        },
      );
      return { notifications: (result.items || []) as NotificationItem[], lastEvaluatedKey: result.lastEvaluatedKey };
    } catch {
      const scan = await this.dynamodb.scan('notifications', {
        filterExpression: options?.unreadOnly
          ? '#company_id = :company_id AND #user_id = :user_id AND #is_read = :is_read'
          : '#company_id = :company_id AND #user_id = :user_id',
        expressionAttributeNames: {
          '#company_id': 'company_id',
          '#user_id': 'user_id',
          ...(options?.unreadOnly ? { '#is_read': 'is_read' } : {}),
        },
        expressionAttributeValues: {
          ':company_id': companyId,
          ':user_id': userId,
          ...(options?.unreadOnly ? { ':is_read': false } : {}),
        },
        limit,
        exclusiveStartKey: options?.lastEvaluatedKey,
      });
      const sorted = (scan.items || []).sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0));
      return { notifications: sorted as NotificationItem[], lastEvaluatedKey: scan.lastEvaluatedKey };
    }
  }

  async getUnreadCount(companyId: string, userId: string): Promise<number> {
    const result = await this.listNotifications(companyId, userId, { limit: 100, unreadOnly: true });
    let count = result.notifications.length;
    let cursor = result.lastEvaluatedKey;

    while (cursor) {
      const page = await this.listNotifications(companyId, userId, {
        limit: 100,
        unreadOnly: true,
        lastEvaluatedKey: cursor,
      });
      count += page.notifications.length;
      cursor = page.lastEvaluatedKey;
    }

    return count;
  }

  async markRead(companyId: string, userId: string, notificationId: string): Promise<NotificationItem> {
    const existing = await this.dynamodb.get('notifications', {
      company_id: companyId,
      notification_id: notificationId,
    });
    if (!existing || existing.user_id !== userId) {
      throw new BadRequestException('Notification not found');
    }
    if (existing.is_read) {
      return existing as NotificationItem;
    }

    const now = Date.now();
    const updated = await this.dynamodb.update(
      'notifications',
      { company_id: companyId, notification_id: notificationId },
      { is_read: true, read_at: now },
    );
    return (updated || { ...existing, is_read: true, read_at: now }) as NotificationItem;
  }

  async markAllRead(companyId: string, userId: string): Promise<{ updated: number }> {
    let updated = 0;
    let cursor: any = undefined;
    const toUpdate: NotificationItem[] = [];

    do {
      const page = await this.listNotifications(companyId, userId, {
        limit: 100,
        unreadOnly: true,
        lastEvaluatedKey: cursor,
      });
      toUpdate.push(...page.notifications);
      cursor = page.lastEvaluatedKey;
    } while (cursor);

    for (const item of toUpdate) {
      try {
        await this.dynamodb.update(
          'notifications',
          { company_id: companyId, notification_id: item.notification_id },
          { is_read: true, read_at: Date.now() },
        );
        updated += 1;
      } catch {
        // Continue best-effort updates for batch action.
      }
    }

    return { updated };
  }

  async registerDevice(
    companyId: string,
    userId: string,
    input: NotificationDeviceRegistration,
  ): Promise<NotificationDevice> {
    const now = Date.now();
    const device: NotificationDevice = {
      company_id: companyId,
      user_id: userId,
      company_user: `${companyId}#${userId}`,
      device_id: input.device_id,
      platform: 'IOS',
      apns_token: String(input.apns_token || '').trim(),
      apns_environment: input.apns_environment || 'production',
      app_version: input.app_version,
      device_model: input.device_model,
      locale: input.locale,
      push_enabled: input.push_enabled !== false,
      is_active: true,
      created_at: now,
      updated_at: now,
      last_seen_at: now,
    };

    if (!device.device_id) {
      throw new BadRequestException('device_id is required');
    }
    if (!device.apns_token) {
      throw new BadRequestException('apns_token is required');
    }

    const existing = await this.dynamodb.get('notification_devices', {
      company_id: companyId,
      device_id: device.device_id,
    });

    if (existing) {
      device.created_at = Number(existing.created_at || now);
    }

    await this.dynamodb.put('notification_devices', device as any);
    return device;
  }

  async removeDevice(companyId: string, userId: string, deviceId: string): Promise<{ removed: boolean }> {
    const existing = await this.dynamodb.get('notification_devices', {
      company_id: companyId,
      device_id: deviceId,
    });

    if (!existing || existing.user_id !== userId) {
      return { removed: false };
    }

    await this.dynamodb.update(
      'notification_devices',
      { company_id: companyId, device_id: deviceId },
      { is_active: false, push_enabled: false, updated_at: Date.now() },
    );
    return { removed: true };
  }

  async dispatchFromWebhookEvent(
    companyId: string,
    event: WebhookEventType,
    data: Record<string, any>,
  ): Promise<void> {
    const mapped = this.mapWebhookEventToNotification(event, data);
    if (!mapped) return;

    await this.createForCompanyUsers(companyId, mapped);
  }

  async emitUsageThresholdNotifications(companyId: string): Promise<void> {
    const company = await this.dynamodb.get('companies', { company_id: companyId });
    const plan = company?.subscription_plan as SubscriptionPlan | undefined;
    if (!plan || !PLAN_LIMITS[plan]) return;

    const limits = PLAN_LIMITS[plan];
    const periodStart = this.resolveUsagePeriodStart(company?.current_period_start);
    const usage = await this.getUsageAggregate(companyId, periodStart);

    await this.maybeEmitUsageThreshold(companyId, periodStart, 'minutes', usage.minutes_used, limits.minutes);
    await this.maybeEmitUsageThreshold(companyId, periodStart, 'sms', usage.sms_sent_count, limits.sms);
    await this.maybeEmitUsageThreshold(companyId, periodStart, 'contacts', usage.contacts_count, limits.contacts);
  }

  private async maybeEmitUsageThreshold(
    companyId: string,
    periodStart: number,
    metric: 'minutes' | 'sms' | 'contacts',
    used: number,
    limit: number,
  ) {
    if (!limit || limit <= 0) return;
    const percent = Number(((used / limit) * 100).toFixed(2));
    const thresholds = [25, 50, 75, 90, 100] as const;

    for (const threshold of thresholds) {
      if (percent < threshold) continue;

      const alertKey = `${periodStart}:${metric}:${threshold}`;
      const existing = await this.dynamodb.get('notification_usage_alerts', {
        company_id: companyId,
        alert_key: alertKey,
      });
      if (existing) continue;

      await this.dynamodb.put('notification_usage_alerts', {
        company_id: companyId,
        alert_key: alertKey,
        created_at: Date.now(),
        period_start: periodStart,
        metric,
        threshold,
      });

      const eventKey = `usage_threshold_${threshold}` as NotificationEventKey;
      const metricLabel = metric === 'minutes' ? 'call minutes' : metric === 'sms' ? 'SMS' : 'contacts';
      await this.createForCompanyUsers(companyId, {
        eventKey,
        category: 'USAGE',
        title: `Usage ${threshold}% reached`,
        body: `You've used ${used}/${limit} ${metricLabel} (${percent.toFixed(0)}%).`,
        actionUrl: '/dashboard/billing',
        payload: {
          metric,
          used,
          limit,
          percent,
          threshold,
          period_start: periodStart,
        },
      });
    }
  }

  private resolveUsagePeriodStart(raw?: number): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    const now = new Date();
    const day = now.getUTCDay() || 7; // Sunday=7
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - day + 1);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.getTime();
  }

  private async getUsageAggregate(companyId: string, periodStart: number) {
    const startDate = new Date(periodStart).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const scan = await this.dynamodb.scan('usage_metrics', {
      filterExpression: '#company_id = :company_id AND #date BETWEEN :start_date AND :end_date',
      expressionAttributeNames: {
        '#company_id': 'company_id',
        '#date': 'date',
      },
      expressionAttributeValues: {
        ':company_id': companyId,
        ':start_date': startDate,
        ':end_date': endDate,
      },
      limit: 200,
    });

    return (scan.items || []).reduce(
      (acc: any, item: any) => ({
        minutes_used: acc.minutes_used + Number(item?.minutes_used || 0),
        sms_sent_count: acc.sms_sent_count + Number(item?.sms_sent_count || 0),
        contacts_count: Math.max(acc.contacts_count, Number(item?.contacts_count || 0)),
      }),
      { minutes_used: 0, sms_sent_count: 0, contacts_count: 0 },
    );
  }

  private mapWebhookEventToNotification(
    event: WebhookEventType,
    data: Record<string, any>,
  ): {
    eventKey: NotificationEventKey;
    category: NotificationCategory;
    title: string;
    body: string;
    actionUrl?: string;
    payload?: Record<string, any>;
  } | null {
    if (event === 'appointment.created') {
      const appt = data?.appointment || {};
      const contact = appt.contact_name || appt.contact_phone || 'Customer';
      return {
        eventKey: 'appointment_created',
        category: 'APPOINTMENTS',
        title: 'New appointment booked',
        body: `${contact} has a new appointment scheduled.`,
        actionUrl: '/dashboard/appointments',
        payload: { appointment_id: appt.appointment_id },
      };
    }

    if (event === 'appointment.updated') {
      const appt = data?.appointment || {};
      const contact = appt.contact_name || appt.contact_phone || 'Customer';
      return {
        eventKey: 'appointment_updated',
        category: 'APPOINTMENTS',
        title: 'Appointment updated',
        body: `${contact}'s appointment was updated.`,
        actionUrl: '/dashboard/appointments',
        payload: { appointment_id: appt.appointment_id },
      };
    }

    if (event === 'appointment.cancelled') {
      const appt = data?.appointment || {};
      const contact = appt.contact_name || appt.contact_phone || 'Customer';
      return {
        eventKey: 'appointment_cancelled',
        category: 'APPOINTMENTS',
        title: 'Appointment cancelled',
        body: `${contact}'s appointment was cancelled.`,
        actionUrl: '/dashboard/appointments',
        payload: { appointment_id: appt.appointment_id },
      };
    }

    if (event === 'call.completed') {
      const call = data?.call || {};
      const from = call.from_number || call.caller_phone || 'Unknown caller';
      return {
        eventKey: 'call_completed',
        category: 'CALLS',
        title: 'New call completed',
        body: `Call from ${from} has been logged.`,
        actionUrl: '/dashboard/calls',
        payload: { call_id: call.call_id },
      };
    }

    if (event === 'contact.created') {
      const contact = data?.contact || {};
      const label = contact.name || contact.phone_number || contact.phone || 'New lead';
      return {
        eventKey: 'lead_created',
        category: 'LEADS',
        title: 'New lead captured',
        body: `${label} was added to your contacts.`,
        actionUrl: '/dashboard/customers',
        payload: { contact_id: contact.contact_id },
      };
    }

    return null;
  }

  private async createForCompanyUsers(
    companyId: string,
    input: {
      eventKey: NotificationEventKey;
      category: NotificationCategory;
      title: string;
      body: string;
      actionUrl?: string;
      payload?: Record<string, any>;
    },
  ): Promise<void> {
    const users = await this.listCompanyUsers(companyId);
    const now = Date.now();

    for (const user of users) {
      const userId = String(user.user_id || '').trim();
      if (!userId) continue;
      if (user.is_active === false) continue;

      const pref = await this.getPreferences(companyId, userId);
      const setting = pref.preferences[input.eventKey];
      if (!setting.in_app && !setting.push) continue;

      let persistedNotification: NotificationItem | null = null;
      if (setting.in_app) {
        persistedNotification = {
          company_id: companyId,
          notification_id: uuidv4(),
          company_user: `${companyId}#${userId}`,
          user_id: userId,
          event_key: input.eventKey,
          category: input.category,
          title: input.title,
          body: input.body,
          channels: setting.push ? ['IN_APP', 'PUSH'] : ['IN_APP'],
          created_at: now,
          is_read: false,
          action_url: input.actionUrl,
          payload: input.payload,
          source_event: input.eventKey,
        };
        await this.dynamodb.put('notifications', persistedNotification as any);
      }

      if (setting.push) {
        await this.sendPushToUserDevices(companyId, userId, {
          title: input.title,
          body: input.body,
          eventKey: input.eventKey,
          actionUrl: input.actionUrl,
          payload: {
            ...(input.payload || {}),
            notification_id: persistedNotification?.notification_id || uuidv4(),
          },
        });
      }
    }
  }

  private async listCompanyUsers(companyId: string): Promise<any[]> {
    const users: any[] = [];
    let cursor: any = undefined;

    do {
      const page = await this.dynamodb.queryByCompany('users', companyId, undefined, {
        limit: 200,
        exclusiveStartKey: cursor,
      });
      users.push(...(page.items || []));
      cursor = page.lastEvaluatedKey;
    } while (cursor);

    return users;
  }

  private defaultPreferences(): NotificationPreferencesMap {
    const out: any = {};
    for (const key of NOTIFICATION_EVENT_KEYS) {
      out[key] = { ...DEFAULT_NOTIFICATION_PREFERENCES[key] };
    }
    return out as NotificationPreferencesMap;
  }

  private normalizePreferences(raw: any): NotificationPreferencesMap {
    const defaults = this.defaultPreferences();
    if (!raw || typeof raw !== 'object') return defaults;

    for (const key of NOTIFICATION_EVENT_KEYS) {
      const item = raw[key];
      if (!item || typeof item !== 'object') continue;
      if (typeof item.in_app === 'boolean') defaults[key].in_app = item.in_app;
      if (typeof item.push === 'boolean') defaults[key].push = item.push;
    }
    return defaults;
  }

  private async sendPushToUserDevices(
    companyId: string,
    userId: string,
    input: {
      title: string;
      body: string;
      eventKey: NotificationEventKey;
      actionUrl?: string;
      payload?: Record<string, any>;
    },
  ) {
    const devices = await this.getUserDevices(companyId, userId);
    if (devices.length === 0) return;

    for (const device of devices) {
      const result = await this.sendApnsNotification(device, input);
      if (!result.ok && result.deactivate) {
        await this.dynamodb.update(
          'notification_devices',
          { company_id: companyId, device_id: device.device_id },
          { is_active: false, push_enabled: false, updated_at: Date.now() },
        );
      }
    }
  }

  private async getUserDevices(companyId: string, userId: string): Promise<NotificationDevice[]> {
    const companyUser = `${companyId}#${userId}`;
    try {
      const result = await this.dynamodb.query(
        'notification_devices',
        '#company_user = :company_user',
        { '#company_user': 'company_user' },
        { ':company_user': companyUser },
        {
          indexName: 'user-index',
          limit: 100,
          scanIndexForward: false,
        },
      );
      return (result.items || []).filter((item: any) => item?.is_active !== false && item?.push_enabled !== false) as NotificationDevice[];
    } catch {
      const scan = await this.dynamodb.scan('notification_devices', {
        filterExpression: '#company_id = :company_id AND #user_id = :user_id',
        expressionAttributeNames: {
          '#company_id': 'company_id',
          '#user_id': 'user_id',
        },
        expressionAttributeValues: {
          ':company_id': companyId,
          ':user_id': userId,
        },
        limit: 100,
      });
      return (scan.items || []).filter((item: any) => item?.is_active !== false && item?.push_enabled !== false) as NotificationDevice[];
    }
  }

  private async sendApnsNotification(
    device: NotificationDevice,
    input: { title: string; body: string; eventKey: NotificationEventKey; actionUrl?: string; payload?: Record<string, any> },
  ): Promise<{ ok: boolean; deactivate?: boolean }> {
    const apns = await this.getApnsConfig();
    if (!apns) {
      return { ok: false };
    }

    const jwt = this.getApnsJwt(apns.teamId, apns.keyId, apns.privateKey);
    const host = device.apns_environment === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
    const payload = JSON.stringify({
      aps: {
        alert: {
          title: input.title,
          body: input.body,
        },
        sound: 'default',
      },
      handycall: {
        event_key: input.eventKey,
        action_url: input.actionUrl,
        ...(input.payload || {}),
      },
    });

    return new Promise((resolve) => {
      const client = http2.connect(`https://${host}`);
      let statusCode = 0;
      let responseBody = '';

      client.on('error', () => {
        try {
          client.close();
        } catch {
          // ignore
        }
        resolve({ ok: false });
      });

      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${device.apns_token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': apns.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
      });

      req.setEncoding('utf8');
      req.on('response', (headers) => {
        statusCode = Number(headers[':status'] || 0);
      });
      req.on('data', (chunk) => {
        responseBody += chunk;
      });
      req.on('end', () => {
        try {
          client.close();
        } catch {
          // ignore
        }
        if (statusCode >= 200 && statusCode < 300) {
          resolve({ ok: true });
          return;
        }

        let reason = '';
        try {
          const parsed = JSON.parse(responseBody || '{}');
          reason = String(parsed?.reason || '');
        } catch {
          reason = '';
        }
        const deactivate = ['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'].includes(reason);
        resolve({ ok: false, deactivate });
      });
      req.on('error', () => {
        try {
          client.close();
        } catch {
          // ignore
        }
        resolve({ ok: false });
      });

      req.write(payload);
      req.end();
    });
  }

  private async getApnsConfig(): Promise<{ keyId: string; teamId: string; bundleId: string; privateKey: string } | null> {
    const now = Math.floor(Date.now() / 1000);
    if (this.apnsConfigCache && this.apnsConfigCache.expiresAt > now + 30) {
      return this.apnsConfigCache.config;
    }

    const keyId = await this.readApnsValue('APNS_KEY_ID', 'APNS_KEY_ID_PARAM', '/handycall/apns/key-id');
    const teamId = await this.readApnsValue('APNS_TEAM_ID', 'APNS_TEAM_ID_PARAM', '/handycall/apns/team-id');
    const bundleId = await this.readApnsValue('APNS_BUNDLE_ID', 'APNS_BUNDLE_ID_PARAM', '/handycall/apns/bundle-id');
    const privateKey = await this.getApnsPrivateKey();

    const config =
      keyId && teamId && bundleId && privateKey
        ? {
            keyId,
            teamId,
            bundleId,
            privateKey,
          }
        : null;
    this.apnsConfigCache = { config, expiresAt: now + 5 * 60 };
    return config;
  }

  private async getApnsPrivateKey(): Promise<string | null> {
    const inline = await this.readApnsValue('APNS_PRIVATE_KEY', 'APNS_PRIVATE_KEY_PARAM', '/handycall/apns/private-key', true);
    if (inline) {
      return inline.includes('\\n') ? inline.replace(/\\n/g, '\n') : inline;
    }

    const base64 = await this.readApnsValue(
      'APNS_PRIVATE_KEY_BASE64',
      'APNS_PRIVATE_KEY_BASE64_PARAM',
      '/handycall/apns/private-key-base64',
      true,
    );
    if (base64) {
      try {
        return Buffer.from(base64, 'base64').toString('utf8');
      } catch {
        return null;
      }
    }

    return null;
  }

  private async readApnsValue(
    envName: string,
    paramPathEnvName: string,
    defaultParamPath: string,
    decrypt: boolean = true,
  ): Promise<string | null> {
    const inline = this.config.get<string>(envName);
    if (typeof inline === 'string' && inline.trim()) {
      return inline.trim();
    }

    const paramPath = this.config.get<string>(paramPathEnvName) || defaultParamPath;
    const fromParameterStore = await this.parameterStore.getParameter(paramPath, decrypt);
    if (typeof fromParameterStore === 'string' && fromParameterStore.trim()) {
      return fromParameterStore.trim();
    }

    return null;
  }

  private getApnsJwt(teamId: string, keyId: string, privateKey: string): string {
    const now = Math.floor(Date.now() / 1000);
    if (this.apnsTokenCache && this.apnsTokenCache.expiresAt > now + 30) {
      return this.apnsTokenCache.jwt;
    }

    const header = this.base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: keyId }));
    const claims = this.base64UrlEncode(JSON.stringify({ iss: teamId, iat: now }));
    const unsigned = `${header}.${claims}`;

    const signer = createSign('SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(privateKey);
    const jwt = `${unsigned}.${this.base64UrlEncode(signature)}`;
    this.apnsTokenCache = {
      jwt,
      expiresAt: now + 50 * 60,
    };
    return jwt;
  }

  private base64UrlEncode(input: string | Buffer): string {
    const b64 = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
