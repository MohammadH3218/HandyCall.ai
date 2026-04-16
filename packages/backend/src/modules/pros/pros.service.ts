import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { OnboardingIdentityDto } from './dto/onboarding-identity.dto';
import { OnboardingProfileDto } from './dto/onboarding-profile.dto';
import { OnboardingServicesDto } from './dto/onboarding-services.dto';
import { OnboardingPayoutDto } from './dto/onboarding-payout.dto';
import { Pro, sarToHalalas } from '@handycall/shared';

@Injectable()
export class ProsService {
  private readonly logger = new Logger(ProsService.name);
  private readonly cognito: CognitoIdentityProviderClient;
  private readonly s3: S3Client;
  private readonly userPoolId: string;
  private readonly mediaBucket: string;

  constructor(
    private db: DynamoDBService,
    private config: ConfigService,
  ) {
    const region = config.get<string>('AWS_REGION') ?? 'me-central-1';
    this.cognito = new CognitoIdentityProviderClient({ region });
    this.s3 = new S3Client({ region });
    this.userPoolId = config.get<string>('COGNITO_USER_POOL_ID') ?? '';
    this.mediaBucket = config.get<string>('S3_BUCKET_MEDIA') ?? config.get<string>('S3_MEDIA_BUCKET') ?? '';
  }

  async findById(proId: string): Promise<Pro> {
    const item = await this.db.get('pros', { pro_id: proId });
    if (!item) throw new NotFoundException('Pro not found');
    const { password_hash: _, ...safe } = item as any;
    return safe as Pro;
  }

  async findPublicProfile(proId: string): Promise<Partial<Pro>> {
    const pro = await this.findById(proId);
    if (pro.status !== 'ACTIVE') throw new NotFoundException('Pro not found');
    // Strip sensitive fields for public view
    const { iban, national_id, iqama_number, id_document_s3_key, ...publicFields } = pro as any;
    return publicFields;
  }

  async listForBrowsing(filters: {
    district?: string;
    category?: string;
    limit?: number;
  }): Promise<Partial<Pro>[]> {
    // Browse active pros. In production, add GSI queries per category/district.
    const { items } = await this.db.scan('pros', {
      filterExpression: '#status = :active',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':active': 'ACTIVE' },
      limit: filters.limit ?? 20,
    });

    return items.map((pro: any) => {
      const { password_hash, iban, national_id, iqama_number, id_document_s3_key, ...safe } = pro;
      return safe;
    });
  }

  // ─── Onboarding Steps ──────────────────────────────────────────────────────

  /** Step 2: Upload ID document */
  async onboardIdentity(proId: string, dto: OnboardingIdentityDto): Promise<Pro> {
    const pro = await this.findById(proId);
    this.assertOnboardingStep(pro, 1);

    const updates: Record<string, any> = {
      onboarding_step: 2,
      updated_at: Date.now(),
    };
    if (dto.id_document_s3_key) updates.id_document_s3_key = dto.id_document_s3_key;
    if (dto.cr_number) updates.cr_number = dto.cr_number;
    if (dto.vat_number) updates.vat_number = dto.vat_number;

    const result = await this.db.update('pros', { pro_id: proId }, updates);
    const { password_hash: _, ...safe } = result as any;
    return safe as Pro;
  }

  /** Step 3: Profile info */
  async onboardProfile(proId: string, dto: OnboardingProfileDto): Promise<Pro> {
    const pro = await this.findById(proId);
    this.assertOnboardingStep(pro, 2);

    const updates: Record<string, any> = {
      ...dto,
      onboarding_step: 3,
      updated_at: Date.now(),
    };

    const result = await this.db.update('pros', { pro_id: proId }, updates);
    const { password_hash: _, ...safe } = result as any;
    return safe as Pro;
  }

  /** Step 4: Services — creates service records in `services` table */
  async onboardServices(proId: string, dto: OnboardingServicesDto): Promise<Pro> {
    const pro = await this.findById(proId);
    this.assertOnboardingStep(pro, 3);

    const now = Date.now();
    for (const svc of dto.services) {
      await this.db.put('services', {
        pro_id: proId,
        service_id: uuidv4(),
        category: svc.category,
        title: svc.title,
        title_ar: svc.title_ar,
        description: svc.description,
        description_ar: svc.description_ar,
        pricing_type: svc.pricing_type,
        // Convert SAR → Halalas for storage (never store floats for money)
        price_sar: svc.price_sar !== undefined ? sarToHalalas(svc.price_sar) : undefined,
        min_price_sar: svc.min_price_sar !== undefined ? sarToHalalas(svc.min_price_sar) : undefined,
        max_price_sar: svc.max_price_sar !== undefined ? sarToHalalas(svc.max_price_sar) : undefined,
        vat_included: svc.vat_included,
        estimated_duration_minutes: svc.estimated_duration_minutes,
        photos_s3_keys: [],
        // Composite key for category-active GSI: "1#<timestamp>" = active
        is_active_created: `1#${now}`,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await this.db.update('pros', { pro_id: proId }, {
      onboarding_step: 4,
      updated_at: now,
    });
    const { password_hash: _, ...safe } = result as any;
    return safe as Pro;
  }

  /** Step 5: Payout & coverage — final onboarding step */
  async onboardPayout(proId: string, dto: OnboardingPayoutDto): Promise<Pro> {
    const pro = await this.findById(proId);
    this.assertOnboardingStep(pro, 4);

    const now = Date.now();

    // Persist availability slots
    for (const slot of dto.availability) {
      await this.db.put('pro_availability', {
        pro_id: proId,
        day_of_week: slot.day_of_week,
        open_time: slot.open_time,
        close_time: slot.close_time,
        is_available: slot.is_available,
        updated_at: now,
      });
    }

    // Complete onboarding — set PENDING_REVIEW (admin must approve before ACTIVE)
    const result = await this.db.update('pros', { pro_id: proId }, {
      iban: dto.iban,
      bank_name: dto.bank_name,
      service_districts: dto.service_districts,
      onboarding_step: 5,
      status: 'PENDING_REVIEW',
      updated_at: now,
    });

    const { password_hash: _, ...safe } = result as any;
    return safe as Pro;
  }

  // ─── Account Deletion ─────────────────────────────────────────────────────

  /**
   * Permanently deletes a pro account and ALL associated data:
   * DynamoDB (pros, services, bookings, reviews, availability, tokens),
   * S3 (profile photo, ID document, listing photos),
   * and Cognito (removes the user from the users pool).
   *
   * Each step is attempted independently so a partial failure in one
   * external system doesn't block the others.
   */
  async deleteAccount(proId: string): Promise<void> {
    // 1. Fetch the pro record first (need email + S3 keys)
    const raw = await this.db.get('pros', { pro_id: proId });
    if (!raw) throw new NotFoundException('Pro not found');
    const pro = raw as Pro & { password_hash?: string; email?: string };

    // 2. Delete DynamoDB: services (composite PK: pro_id + service_id)
    try {
      const { items: services } = await this.db.query(
        'services',
        'pro_id = :pid',
        { '#pid': 'pro_id' },
        { ':pid': proId },
        { indexName: undefined },
      );
      await Promise.all(
        services.map((s: any) =>
          this.db.delete('services', { pro_id: proId, service_id: s.service_id }),
        ),
      );
    } catch (e) {
      this.logger.warn(`deleteAccount[${proId}] services cleanup failed: ${e}`);
    }

    // 3. Delete DynamoDB: bookings (query GSI by pro_id, PK = booking_id)
    try {
      const { items: bookings } = await this.db.query(
        'bookings',
        'pro_id = :pid',
        { '#pid': 'pro_id' },
        { ':pid': proId },
        { indexName: 'pro_id-index' },
      );
      await Promise.all(
        bookings.map((b: any) =>
          this.db.delete('bookings', { booking_id: b.booking_id }),
        ),
      );
    } catch (e) {
      this.logger.warn(`deleteAccount[${proId}] bookings cleanup failed: ${e}`);
    }

    // 4. Delete DynamoDB: reviews (query GSI by pro_id, PK = review_id)
    try {
      const { items: reviews } = await this.db.query(
        'reviews',
        'pro_id = :pid',
        { '#pid': 'pro_id' },
        { ':pid': proId },
        { indexName: 'pro_id-index' },
      );
      await Promise.all(
        reviews.map((r: any) =>
          this.db.delete('reviews', { review_id: r.review_id }),
        ),
      );
    } catch (e) {
      this.logger.warn(`deleteAccount[${proId}] reviews cleanup failed: ${e}`);
    }

    // 5. Delete DynamoDB: pro_availability (PK = pro_id)
    try {
      await this.db.delete('pro_availability', { pro_id: proId });
    } catch (e) {
      this.logger.warn(`deleteAccount[${proId}] availability cleanup failed: ${e}`);
    }

    // 6. Delete DynamoDB: email_verifications & password_resets by email
    if (pro.email) {
      try {
        await this.db.delete('email_verifications', { email: pro.email });
      } catch (e) {
        this.logger.warn(`deleteAccount[${proId}] email_verifications cleanup failed: ${e}`);
      }
      try {
        await this.db.delete('password_resets', { email: pro.email });
      } catch (e) {
        this.logger.warn(`deleteAccount[${proId}] password_resets cleanup failed: ${e}`);
      }
    }

    // 7. Delete S3 objects (profile photo, ID document, listing photos)
    const s3Keys: string[] = [
      (pro as any).profile_photo_s3_key,
      (pro as any).id_document_s3_key,
      ...((pro as any).photos_s3_keys ?? []),
    ].filter(Boolean);

    if (s3Keys.length > 0 && this.mediaBucket) {
      await Promise.allSettled(
        s3Keys.map((key) =>
          this.s3.send(new DeleteObjectCommand({ Bucket: this.mediaBucket, Key: key })),
        ),
      );
    }

    // 8. Delete pro record from DynamoDB
    await this.db.delete('pros', { pro_id: proId });

    // 9. Delete from Cognito — look up the real username by email first.
    //    Federated users (Google/Apple) have usernames like "Google_12345", not the email.
    if (pro.email && this.userPoolId) {
      try {
        const listResult = await this.cognito.send(
          new ListUsersCommand({
            UserPoolId: this.userPoolId,
            Filter: `email = "${pro.email}"`,
            Limit: 5,
          }),
        );
        const cognitoUsers = listResult.Users ?? [];
        await Promise.all(
          cognitoUsers.map((u) =>
            this.cognito.send(
              new AdminDeleteUserCommand({
                UserPoolId: this.userPoolId,
                Username: u.Username!,
              }),
            ).catch((e: any) => {
              if (e?.name !== 'UserNotFoundException') {
                this.logger.warn(`deleteAccount[${proId}] Cognito deletion failed for ${u.Username}: ${e}`);
              }
            }),
          ),
        );
      } catch (e: any) {
        this.logger.warn(`deleteAccount[${proId}] Cognito lookup/deletion failed: ${e}`);
      }
    }

    this.logger.log(`Pro account ${proId} (${pro.email}) permanently deleted.`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private assertOnboardingStep(pro: Pro, expectedStep: number) {
    if (pro.onboarding_step !== expectedStep) {
      throw new BadRequestException(
        `Onboarding step mismatch. Expected step ${expectedStep}, current step is ${pro.onboarding_step}.`,
      );
    }
  }
}
