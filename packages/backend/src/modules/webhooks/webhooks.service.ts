import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { WEBHOOK_PUBLIC_EVENTS, PublicWebhookEventType, WebhookEventType } from './webhooks.types';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export interface WebhookConfig {
  company_id: string;
  webhook_url: string;
  enabled_events?: WebhookEventType[];
  signing_secret: string;
  is_enabled: boolean;
  created_at: number;
  updated_at: number;
  last_delivery_at?: number;
  last_success_at?: number;
  last_status_code?: number;
  last_error?: string;
  last_event?: WebhookEventType;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  company_id: string;
  created_at: number;
  data: Record<string, any>;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  status?: number;
  error?: string;
  response_time_ms?: number;
}

@Injectable()
export class WebhooksService {
  private readonly defaultTimeoutMs = 6000;
  private sqs?: SQSClient;
  private sqsUrl?: string;

  constructor(
    private readonly dynamodb: DynamoDBService,
    private readonly config: ConfigService,
  ) {
    this.sqsUrl = this.config.get<string>('WEBHOOK_SQS_URL') || undefined;
    if (this.sqsUrl) {
      const region = this.config.get<string>('AWS_REGION') || 'us-east-1';
      this.sqs = new SQSClient({ region });
    }
  }

  listEvents(): WebhookEventType[] {
    return [...WEBHOOK_PUBLIC_EVENTS];
  }

  async getConfig(companyId: string): Promise<WebhookConfig | null> {
    const config = await this.dynamodb.get('webhook_configs', { company_id: companyId });
    return (config as WebhookConfig) || null;
  }

  async upsertConfig(
    companyId: string,
    input: { webhook_url?: string; enabled_events?: string[]; is_enabled?: boolean },
  ): Promise<WebhookConfig> {
    const now = Date.now();
    const existing = await this.getConfig(companyId);

    const updates: Partial<WebhookConfig> = {
      updated_at: now,
    };

    if (input.webhook_url !== undefined) {
      updates.webhook_url = this.normalizeWebhookUrl(input.webhook_url);
    }

    if (input.enabled_events !== undefined) {
      updates.enabled_events = this.normalizeEvents(input.enabled_events);
    }

    if (input.is_enabled !== undefined) {
      updates.is_enabled = Boolean(input.is_enabled);
    }

    if (!existing) {
      if (!updates.webhook_url) {
        throw new BadRequestException('webhook_url is required');
      }
      const created: WebhookConfig = {
        company_id: companyId,
        webhook_url: updates.webhook_url,
        enabled_events: updates.enabled_events?.length
          ? updates.enabled_events
          : [...WEBHOOK_PUBLIC_EVENTS],
        signing_secret: this.generateSecret(),
        is_enabled: updates.is_enabled ?? true,
        created_at: now,
        updated_at: now,
      };
      await this.dynamodb.put('webhook_configs', created);
      return created;
    }

    if (Object.keys(updates).length === 1) {
      return existing;
    }

    const merged: WebhookConfig = {
      ...existing,
      ...updates,
    };

    await this.dynamodb.update('webhook_configs', { company_id: companyId }, updates);
    return merged;
  }

  async rotateSecret(companyId: string): Promise<WebhookConfig> {
    const existing = await this.getConfig(companyId);
    if (!existing) {
      throw new BadRequestException('Webhook config not found');
    }
    const secret = this.generateSecret();
    const updated_at = Date.now();
    await this.dynamodb.update(
      'webhook_configs',
      { company_id: companyId },
      { signing_secret: secret, updated_at }
    );
    return { ...existing, signing_secret: secret, updated_at };
  }

  async testWebhook(companyId: string): Promise<WebhookDeliveryResult> {
    const config = await this.getConfig(companyId);
    if (!config || !config.webhook_url) {
      throw new BadRequestException('Webhook is not configured');
    }

    const payload: WebhookPayload = {
      id: uuidv4(),
      event: 'test.ping',
      company_id: companyId,
      created_at: Date.now(),
      data: {
        message: 'HandyCall webhook test',
        test: true,
      },
    };

    return this.dispatch(config, payload, { updateStatus: true });
  }

  async emitEvent(
    companyId: string,
    event: WebhookEventType,
    data: Record<string, any>,
    options?: { awaitDelivery?: boolean },
  ): Promise<void | WebhookDeliveryResult> {
    const config = await this.getConfig(companyId);
    if (!config || !config.webhook_url || config.is_enabled === false) {
      return;
    }

    if (event !== 'test.ping' && Array.isArray(config.enabled_events) && config.enabled_events.length > 0) {
      if (!config.enabled_events.includes(event)) {
        return;
      }
    }

    const payload: WebhookPayload = {
      id: uuidv4(),
      event,
      company_id: companyId,
      created_at: Date.now(),
      data,
    };

    if (options?.awaitDelivery) {
      return this.dispatch(config, payload, { updateStatus: true });
    }

    const queued = await this.enqueueEvent(companyId, payload);
    if (queued) {
      return;
    }

    void this.dispatch(config, payload, { updateStatus: true }).catch((err) => {
      console.warn('[WebhooksService] Delivery failed:', err?.message ?? err);
    });
  }

  private normalizeEvents(input: string[]): WebhookEventType[] {
    const unique = Array.from(
      new Set(
        (input || [])
          .map((e) => String(e || '').trim())
          .filter(Boolean)
      )
    );
    const invalid = unique.filter((e) => !WEBHOOK_PUBLIC_EVENTS.includes(e as PublicWebhookEventType));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid webhook events: ${invalid.join(', ')}`);
    }
    return unique as WebhookEventType[];
  }

  private normalizeWebhookUrl(raw: string): string {
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      throw new BadRequestException('webhook_url is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException('webhook_url is invalid');
    }

    const isHttps = parsed.protocol === 'https:';
    const allowHttp =
      this.config.get<string>('NODE_ENV') !== 'production' &&
      (parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '0.0.0.0');

    if (!isHttps && !allowHttp) {
      throw new BadRequestException('webhook_url must be https (http allowed only for localhost)');
    }

    return parsed.toString();
  }

  private generateSecret(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  private buildSignature(secret: string, timestamp: string, body: string): string {
    const signed = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`, 'utf8')
      .digest('hex');
    return signed;
  }

  private async enqueueEvent(companyId: string, payload: WebhookPayload): Promise<boolean> {
    if (!this.sqs || !this.sqsUrl) return false;
    const body = JSON.stringify({
      company_id: companyId,
      payload,
      enqueued_at: Date.now(),
    });

    try {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: this.sqsUrl,
          MessageBody: body,
        })
      );
      return true;
    } catch (err: any) {
      console.warn('[WebhooksService] Failed to enqueue webhook event:', err?.message ?? err);
      return false;
    }
  }

  private async dispatch(
    config: WebhookConfig,
    payload: WebhookPayload,
    options?: { updateStatus?: boolean },
  ): Promise<WebhookDeliveryResult> {
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.buildSignature(config.signing_secret, timestamp, body);

    const timeoutMs = Number(this.config.get<string>('WEBHOOK_TIMEOUT_MS') || this.defaultTimeoutMs);
    const startedAt = Date.now();

    try {
      const response = await axios.post(config.webhook_url, body, {
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HandyCall-Webhooks/1.0',
          'X-HandyCall-Event': payload.event,
          'X-HandyCall-Timestamp': timestamp,
          'X-HandyCall-Signature': `t=${timestamp},v1=${signature}`,
        },
        validateStatus: () => true,
      });

      const ok = response.status >= 200 && response.status < 300;
      const result: WebhookDeliveryResult = {
        ok,
        status: response.status,
        response_time_ms: Date.now() - startedAt,
      };

      if (options?.updateStatus) {
        await this.recordDelivery(config.company_id, payload.event, ok, response.status);
      }

      return result;
    } catch (err: any) {
      const message = err?.message ?? 'Webhook delivery failed';
      if (options?.updateStatus) {
        await this.recordDelivery(config.company_id, payload.event, false, undefined, message);
      }
      return {
        ok: false,
        error: message,
        response_time_ms: Date.now() - startedAt,
      };
    }
  }

  private async recordDelivery(
    companyId: string,
    event: WebhookEventType,
    ok: boolean,
    status?: number,
    error?: string,
  ) {
    const now = Date.now();
    const statusCode = typeof status === 'number' ? status : ok ? undefined : 0;
    const updates: Partial<WebhookConfig> = {
      last_delivery_at: now,
      last_event: event,
      ...(typeof statusCode === 'number' ? { last_status_code: statusCode } : {}),
      ...(ok ? { last_success_at: now, last_error: '' } : { last_error: error || 'Delivery failed' }),
    };

    try {
      await this.dynamodb.update('webhook_configs', { company_id: companyId }, updates);
    } catch (err) {
      console.warn('[WebhooksService] Failed to persist webhook status:', err?.message ?? err);
    }
  }
}
