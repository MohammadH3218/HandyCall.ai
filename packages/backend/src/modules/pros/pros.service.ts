import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
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
import { S3Service } from '../../infrastructure/storage/s3.service';
import { OnboardingIdentityDto } from './dto/onboarding-identity.dto';
import { OnboardingProfileDto } from './dto/onboarding-profile.dto';
import { OnboardingServicesDto } from './dto/onboarding-services.dto';
import { OnboardingPayoutDto } from './dto/onboarding-payout.dto';
import { OnboardingAccountSetupDto } from './dto/onboarding-account-setup.dto';
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
    private storageService: S3Service,
  ) {
    const awsRegion = config.get<string>('AWS_REGION') ?? 'me-central-1';
    // Cognito may live in a different region from DynamoDB/S3 (e.g. us-east-1 vs me-central-1)
    const cognitoRegion =
      config.get<string>('COGNITO_REGION') ??
      config.get<string>('AWS_COGNITO_REGION') ??
      'us-east-1';
    this.cognito = new CognitoIdentityProviderClient({ region: cognitoRegion });
    this.s3 = new S3Client({ region: awsRegion });
    this.userPoolId =
      config.get<string>('COGNITO_USER_POOL_ID') ??
      config.get<string>('AWS_COGNITO_USERS_POOL_ID') ??
      '';
    this.mediaBucket = config.get<string>('S3_BUCKET_MEDIA') ?? config.get<string>('S3_MEDIA_BUCKET') ?? '';
  }

  async findById(proId: string): Promise<Pro> {
    const item = await this.db.get('pros', { pro_id: proId });
    if (!item) throw new NotFoundException('Pro not found');
    const { password_hash: _, ...safe } = item as any;
    return this.decorateMediaUrls(safe as Pro);
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

    const sanitized = items.map((pro: any) => {
      const { password_hash, iban, national_id, iqama_number, id_document_s3_key, ...safe } = pro;
      return safe;
    });
    return Promise.all(sanitized.map((pro) => this.decorateMediaUrls(pro as Pro)));
  }

  // ─── Onboarding Steps ──────────────────────────────────────────────────────

  /** Account setup: ID, phone, national address — must be completed before marketplace profile */
  async onboardAccountSetup(proId: string, dto: OnboardingAccountSetupDto): Promise<Pro> {
    const now = Date.now();
    const updates: Record<string, any> = {
      account_setup_done: true,
      updated_at: now,
    };

    if (dto.id_type) updates.id_type = dto.id_type;
    if (dto.id_number) {
      if (dto.id_type === 'NATIONAL_ID') updates.national_id = dto.id_number;
      else if (dto.id_type === 'IQAMA') updates.iqama_number = dto.id_number;
    }
    if (dto.phone_number) updates.phone_number = dto.phone_number;
    if (dto.national_address_short) updates.national_address_short = dto.national_address_short;
    if (dto.national_address_building) updates.national_address_building = dto.national_address_building;
    if (dto.national_address_street) updates.national_address_street = dto.national_address_street;
    if (dto.national_address_district) updates.national_address_district = dto.national_address_district;
    if (dto.national_address_city) updates.national_address_city = dto.national_address_city;
    if (dto.national_address_postal_code) updates.national_address_postal_code = dto.national_address_postal_code;

    const result = await this.db.update('pros', { pro_id: proId }, updates);
    const { password_hash: _, ...safe } = result as any;
    return safe as Pro;
  }

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
    // Only include iban/bank_name when provided (DynamoDB rejects undefined values)
    const payoutUpdate: Record<string, any> = {
      service_districts: dto.service_districts,
      onboarding_step: 5,
      status: 'PENDING_REVIEW',
      updated_at: now,
    };
    if (dto.iban !== undefined) payoutUpdate.iban = dto.iban;
    if (dto.bank_name !== undefined) payoutUpdate.bank_name = dto.bank_name;

    const result = await this.db.update('pros', { pro_id: proId }, payoutUpdate);

    const { password_hash: _, ...safe } = result as any;
    return safe as Pro;
  }

  // ─── Marketplace Profile Update (post-onboarding dashboard) ─────────────────

  /** Update the pro's marketplace profile fields (bio, services, districts, etc.) */
  async updateMarketplaceProfile(proId: string, data: Record<string, any>): Promise<Partial<Pro>> {
    const pro = await this.findById(proId);
    if (!pro) throw new NotFoundException('Pro not found');

    const cleanData = await this.normalizeMarketplaceProfileUpdate(proId, pro, data);

    const updates: Record<string, any> = {
      ...cleanData,
      updated_at: Date.now(),
    };

    // Promote to PENDING_REVIEW (awaiting admin approval) only when the
    // marketplace profile is being marked complete for the first time.
    // Already-approved / active pros editing their profile should not be demoted.
    if (data.marketplace_profile_completed === true && pro.status === 'ONBOARDING') {
      updates.status = 'PENDING_REVIEW';
    }

    try {
      const result = await this.db.update('pros', { pro_id: proId }, updates);
      if (!result) {
        this.logger.error(`updateMarketplaceProfile[${proId}]: DynamoDB update returned no attributes`);
        throw new Error('Profile update failed — please try again');
      }
      const { password_hash: _, iban, national_id, iqama_number, id_document_s3_key, ...safe } = result as any;
      return this.decorateMediaUrls(safe as Pro);
    } catch (err: any) {
      this.logger.error(`updateMarketplaceProfile[${proId}] DynamoDB error: ${err?.message || err}`, err?.stack);
      throw err;
    }
  }

  async createMarketplaceMediaUpload(
    proId: string,
    data: { kind?: 'profile_photo' | 'work_photo'; content_type?: string; file_name?: string },
  ): Promise<{ upload_url: string; key: string }> {
    const kind = data?.kind === 'profile_photo' ? 'profile_photo' : 'work_photo';
    const contentType = typeof data?.content_type === 'string' ? data.content_type.trim().toLowerCase() : '';
    const fileName = typeof data?.file_name === 'string' ? data.file_name.trim() : '';

    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported.');
    }

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(contentType)) {
      throw new BadRequestException('Only JPG, PNG, and WebP images are supported.');
    }

    const extension = this.extensionForMimeType(contentType, fileName);
    const key =
      kind === 'profile_photo'
        ? `photos/${proId}/profile-${Date.now()}${extension}`
        : `photos/${proId}/portfolio/${Date.now()}-${uuidv4()}${extension}`;

    const uploadUrl = await this.storageService.getDocumentUploadUrl(key, contentType);
    return {
      upload_url: uploadUrl,
      key,
    };
  }

  private async decorateMediaUrls<T extends Record<string, any>>(pro: T): Promise<T> {
    if (!pro || typeof pro !== 'object') return pro;

    const profilePhotoKey =
      typeof pro.profile_photo_s3_key === 'string' && pro.profile_photo_s3_key.trim()
        ? pro.profile_photo_s3_key.trim()
        : '';
    const workPhotoKeys = Array.isArray(pro.work_photo_s3_keys)
      ? pro.work_photo_s3_keys.filter((key: unknown): key is string => typeof key === 'string' && key.trim().length > 0)
      : [];

    const marketplaceProfile =
      pro.marketplace_profile && typeof pro.marketplace_profile === 'object'
        ? { ...pro.marketplace_profile }
        : {};

    try {
      if (profilePhotoKey) {
        const profilePhotoUrl = await this.storageService.getDocumentUrl(profilePhotoKey);
        (pro as any).profile_photo_url = profilePhotoUrl;
        marketplaceProfile.profile_photo = profilePhotoUrl;
      }

      if (workPhotoKeys.length > 0) {
        const workPhotoUrls = await this.storageService.getDocumentUrls(workPhotoKeys);
        (pro as any).work_photo_urls = workPhotoUrls;
        marketplaceProfile.portfolio_photos = workPhotoUrls;
      }
    } catch (error: any) {
      this.logger.warn(`decorateMediaUrls[${pro.pro_id || 'unknown'}] failed: ${error?.message || error}`);
    }

    if (Object.keys(marketplaceProfile).length > 0) {
      (pro as any).marketplace_profile = marketplaceProfile;
    }

    return pro;
  }

  private async normalizeMarketplaceProfileUpdate(
    proId: string,
    pro: Pro,
    data: Record<string, any>,
  ): Promise<Record<string, any>> {
    const cleanData = { ...data };
    const marketplaceProfile =
      cleanData.marketplace_profile && typeof cleanData.marketplace_profile === 'object'
        ? { ...cleanData.marketplace_profile }
        : {};

    const existingProfilePhotoKey =
      typeof cleanData.existing_profile_photo_s3_key === 'string' && cleanData.existing_profile_photo_s3_key.trim()
        ? cleanData.existing_profile_photo_s3_key.trim()
        : typeof (pro as any).profile_photo_s3_key === 'string'
          ? (pro as any).profile_photo_s3_key
          : '';
    const existingWorkPhotoKeys = Array.isArray(cleanData.existing_work_photo_s3_keys)
      ? cleanData.existing_work_photo_s3_keys.filter((key: unknown): key is string => typeof key === 'string' && key.trim().length > 0)
      : Array.isArray((pro as any).work_photo_s3_keys)
        ? ((pro as any).work_photo_s3_keys as string[]).filter(Boolean)
        : [];

    const providedProfilePhotoKey =
      typeof cleanData.profile_photo_s3_key === 'string' && cleanData.profile_photo_s3_key.trim()
        ? cleanData.profile_photo_s3_key.trim()
        : '';
    const providedWorkPhotoKeys = Array.isArray(cleanData.work_photo_s3_keys)
      ? cleanData.work_photo_s3_keys.filter((key: unknown): key is string => typeof key === 'string' && key.trim().length > 0)
      : [];

    const nextProfilePhotoKey = providedProfilePhotoKey || await this.persistMarketplaceProfilePhoto(
      proId,
      marketplaceProfile.profile_photo,
      existingProfilePhotoKey,
    );
    const nextWorkPhotoKeys =
      providedWorkPhotoKeys.length > 0 || Array.isArray(marketplaceProfile.portfolio_photos)
        ? (providedWorkPhotoKeys.length > 0
            ? providedWorkPhotoKeys
            : await this.persistMarketplaceWorkPhotos(
                proId,
                marketplaceProfile.portfolio_photos,
                existingWorkPhotoKeys,
              ))
        : existingWorkPhotoKeys;

    marketplaceProfile.profile_photo = '';
    marketplaceProfile.portfolio_photos = [];

    cleanData.marketplace_profile = marketplaceProfile;
    cleanData.profile_photo_s3_key = nextProfilePhotoKey;
    cleanData.work_photo_s3_keys = nextWorkPhotoKeys;

    if (typeof marketplaceProfile.bio === 'string') cleanData.bio = marketplaceProfile.bio;
    if (typeof marketplaceProfile.service_category === 'string') cleanData.service_category = marketplaceProfile.service_category;
    if (Array.isArray(marketplaceProfile.services_offered)) cleanData.services_offered = marketplaceProfile.services_offered;
    if (Array.isArray(marketplaceProfile.property_types)) cleanData.property_types = marketplaceProfile.property_types;
    if (Array.isArray(marketplaceProfile.payment_methods)) cleanData.payment_methods = marketplaceProfile.payment_methods;
    if (typeof marketplaceProfile.contact_for_price === 'boolean') cleanData.contact_for_price = marketplaceProfile.contact_for_price;
    if (Array.isArray(marketplaceProfile.service_districts)) cleanData.service_districts = marketplaceProfile.service_districts;
    if (typeof marketplaceProfile.instagram === 'string') cleanData.instagram_handle = marketplaceProfile.instagram;
    if (typeof marketplaceProfile.snapchat === 'string') cleanData.snapchat_handle = marketplaceProfile.snapchat;
    if (typeof marketplaceProfile.twitter === 'string') cleanData.twitter_handle = marketplaceProfile.twitter;
    if (typeof marketplaceProfile.website === 'string') cleanData.website_url = marketplaceProfile.website;
    if (typeof marketplaceProfile.employees === 'string') cleanData.employee_count_range = marketplaceProfile.employees;

    const yearsInBusiness = Number.parseInt(String(marketplaceProfile.years_in_business ?? ''), 10);
    if (Number.isFinite(yearsInBusiness) && yearsInBusiness >= 0) {
      cleanData.years_experience = yearsInBusiness;
    }

    if (
      marketplaceProfile.starting_price !== undefined &&
      marketplaceProfile.starting_price !== null &&
      String(marketplaceProfile.starting_price).trim() !== ''
    ) {
      const startingPrice = Number.parseFloat(String(marketplaceProfile.starting_price));
      if (Number.isFinite(startingPrice) && startingPrice >= 0) {
        cleanData.starting_price_sar = sarToHalalas(startingPrice);
      }
    } else if (marketplaceProfile.contact_for_price === true) {
      cleanData.starting_price_sar = 0;
    }

    delete cleanData.existing_profile_photo_s3_key;
    delete cleanData.existing_work_photo_s3_keys;

    return cleanData;
  }

  private async persistMarketplaceProfilePhoto(
    proId: string,
    profilePhoto: unknown,
    existingKey: string,
  ): Promise<string> {
    if (typeof profilePhoto !== 'string' || !profilePhoto.trim()) {
      return '';
    }

    if (!this.isDataUrl(profilePhoto)) {
      return existingKey;
    }

    const { buffer, contentType, extension } = this.decodeDataUrl(profilePhoto);
    return this.storageService.uploadFile(
      buffer,
      `photos/${proId}/profile-${Date.now()}${extension}`,
      contentType,
    );
  }

  private async persistMarketplaceWorkPhotos(
    proId: string,
    portfolioPhotos: unknown,
    existingKeys: string[],
  ): Promise<string[]> {
    if (!Array.isArray(portfolioPhotos) || portfolioPhotos.length === 0) {
      return [];
    }

    const nextKeys: string[] = [];
    for (let index = 0; index < portfolioPhotos.length; index += 1) {
      const photo = portfolioPhotos[index];
      if (typeof photo !== 'string' || !photo.trim()) continue;

      if (!this.isDataUrl(photo)) {
        if (existingKeys[index]) {
          nextKeys.push(existingKeys[index]);
        }
        continue;
      }

      const { buffer, contentType, extension } = this.decodeDataUrl(photo);
      const key = await this.storageService.uploadFile(
        buffer,
        `photos/${proId}/portfolio/${Date.now()}-${index}${extension}`,
        contentType,
      );
      nextKeys.push(key);
    }

    return nextKeys;
  }

  private isDataUrl(value: string): boolean {
    return value.startsWith('data:');
  }

  private decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string; extension: string } {
    const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('Invalid image payload');
    }

    const [, contentType, base64Payload] = match;
    const buffer = Buffer.from(base64Payload, 'base64');
    const extension = this.extensionForMimeType(contentType);
    return { buffer, contentType, extension };
  }

  private extensionForMimeType(contentType: string, fileName = ''): string {
    const fileExt = extname(fileName).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fileExt)) {
      return fileExt === '.jpeg' ? '.jpg' : fileExt;
    }
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('gif')) return '.gif';
    return '.jpg';
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
