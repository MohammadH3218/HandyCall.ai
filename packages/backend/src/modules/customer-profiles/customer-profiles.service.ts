import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class CustomerProfilesService {
  constructor(private readonly dynamodb: DynamoDBService) {}

  private normalizeUpdateValue(value: string | undefined) {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private async scanAllProfiles() {
    const items: any[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await this.dynamodb.scan('customer_profiles', {
        limit: 200,
        exclusiveStartKey: lastEvaluatedKey,
      });
      items.push(...(result.items || []));
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
  }

  isComplete(profile: any) {
    return Boolean(
      String(profile?.name || '').trim() &&
        String(profile?.phone || '').trim() &&
        String(profile?.address_line1 || '').trim() &&
        String(profile?.city || '').trim() &&
        String(profile?.state || '').trim() &&
        String(profile?.zipcode || '').trim(),
    );
  }

  async getOrCreate(
    userId: string,
    data?: {
      email?: string;
      name?: string;
      phone?: string;
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      zipcode?: string;
    },
  ) {
    const existing = await this.getByUserId(userId);
    if (existing) return existing;

    const now = Date.now();
    const profileId = uuidv4();
    const profile = {
      user_id: userId,
      profile_id: profileId,
      email: data?.email,
      name: data?.name,
      phone: data?.phone,
      address_line1: this.normalizeUpdateValue(data?.address_line1),
      address_line2: this.normalizeUpdateValue(data?.address_line2),
      city: this.normalizeUpdateValue(data?.city),
      state: this.normalizeUpdateValue(data?.state),
      zipcode: this.normalizeUpdateValue(data?.zipcode),
      created_at: now,
      updated_at: now,
    };

    await this.dynamodb.put('customer_profiles', profile);
    return profile;
  }

  async getByUserId(userId: string) {
    return (await this.scanAllProfiles()).find((item: any) => item.user_id === userId) || null;
  }

  async getByEmail(email?: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    return (
      (await this.scanAllProfiles()).find(
        (item: any) => String(item.email || '').trim().toLowerCase() === normalizedEmail,
      ) || null
    );
  }

  async deleteByUserId(userId: string): Promise<void> {
    const profile = await this.getByUserId(userId);
    if (!profile) return;
    await this.dynamodb.delete('customer_profiles', {
      user_id: userId,
      profile_id: (profile as any).profile_id,
    });
  }

  async update(
    userId: string,
    updates: {
      name?: string;
      phone?: string;
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      default_location?: string;
      notification_prefs?: any;
    },
  ) {
    const profile = await this.getByUserId(userId);
    if (!profile) return this.getOrCreate(userId, updates);

    const normalizedUpdates = {
      ...updates,
      name: this.normalizeUpdateValue(updates.name),
      phone: this.normalizeUpdateValue(updates.phone),
      address_line1: this.normalizeUpdateValue(updates.address_line1),
      address_line2: this.normalizeUpdateValue(updates.address_line2),
      city: this.normalizeUpdateValue(updates.city),
      state: this.normalizeUpdateValue(updates.state),
      zipcode: this.normalizeUpdateValue(updates.zipcode),
    };

    const validUpdates: Record<string, any> = { updated_at: Date.now() };
    for (const [key, value] of Object.entries(normalizedUpdates)) {
      if (value !== undefined) validUpdates[key] = value;
    }

    await this.dynamodb.update(
      'customer_profiles',
      { user_id: userId, profile_id: (profile as any).profile_id },
      validUpdates,
    );

    return this.getByUserId(userId);
  }
}
