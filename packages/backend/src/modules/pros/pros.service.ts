import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { OnboardingIdentityDto } from './dto/onboarding-identity.dto';
import { OnboardingProfileDto } from './dto/onboarding-profile.dto';
import { OnboardingServicesDto } from './dto/onboarding-services.dto';
import { OnboardingPayoutDto } from './dto/onboarding-payout.dto';
import { OnboardingAccountDto } from './dto/onboarding-account.dto';
import { OnboardingMarketplaceDto } from './dto/onboarding-marketplace.dto';
import { SaudiVerificationService } from './saudi-verification.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import {
  Pro,
  ProAvailability,
  ProService,
  RIYADH_DISTRICTS,
  sarToHalalas,
} from '@handycall/shared';

const CATEGORY_LABELS: Record<string, string> = {
  AC_HVAC: 'AC & HVAC',
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  PAINTING: 'Painting',
  CLEANING: 'Cleaning',
  PEST_CONTROL: 'Pest Control',
  CARPENTRY: 'Carpentry',
  MOVING: 'Moving',
  APPLIANCE_REPAIR: 'Appliance Repair',
  SATELLITE_DISH: 'Satellite Dish',
  LANDSCAPING: 'Landscaping',
  GENERAL_HANDYMAN: 'General Handyman',
};

@Injectable()
export class ProsService {
  constructor(
    private readonly db: DynamoDBService,
    private readonly saudiVerificationService: SaudiVerificationService,
    private readonly s3Service: S3Service,
  ) {}

  async findById(proId: string): Promise<Pro> {
    const item = await this.db.get('pros', { pro_id: proId });
    if (!item) throw new NotFoundException('Pro not found');
    const { password_hash: _passwordHash, ...safe } = item as any;
    return (await this.decorateProMedia(safe)) as Pro;
  }

  async getOnboardingStatus(proId: string) {
    const [pro, services, availability] = await Promise.all([
      this.findById(proId),
      this.getServicesByPro(proId),
      this.getAvailabilityByPro(proId),
    ]);

    return {
      pro,
      services,
      availability,
    };
  }

  async findPublicProfile(proId: string): Promise<Record<string, any>> {
    const pro = await this.findById(proId);
    if (pro.status !== 'ACTIVE') throw new NotFoundException('Pro not found');

    const [services, availability] = await Promise.all([
      this.getServicesByPro(proId),
      this.getAvailabilityByPro(proId),
    ]);

    const {
      iban,
      national_id,
      iqama_number,
      id_document_s3_key,
      national_address,
      id_verification_reference,
      national_address_verification_reference,
      ...publicFields
    } = pro as any;

    return this.decorateProMedia({
      ...publicFields,
      services,
      availability,
    });
  }

  async listForBrowsing(filters: {
    district?: string;
    category?: string;
    limit?: number;
    query?: string;
  }): Promise<Record<string, any>[]> {
    const services = filters.category
      ? (
          await this.db.query(
            'services',
            '#category = :category AND begins_with(is_active_created, :active)',
            { '#category': 'category' },
            { ':category': filters.category, ':active': '1#' },
            { indexName: 'category-active-index', limit: filters.limit ?? 24 },
          )
        ).items
      : (
          await this.db.scan('services', {
            filterExpression: 'is_active = :active',
            expressionAttributeValues: { ':active': true },
            limit: filters.limit ?? 24,
          })
        ).items;

    const ranked = await Promise.all(
      services.map(async (service: any) => {
        const pro = (await this.db.get('pros', { pro_id: service.pro_id })) as Pro | undefined;
        if (!pro || pro.status !== 'ACTIVE') return null;

        const districtScore = filters.district
          ? pro.service_districts?.includes(filters.district)
            ? 35
            : 0
          : 0;
        const queryScore = filters.query ? this.scoreSearch(service, filters.query) : 0;

        if (filters.district && districtScore === 0) {
          return null;
        }

        return {
          pro_id: pro.pro_id,
          service,
          pro,
          score: queryScore + districtScore + (pro.average_rating || 0) / 100,
        };
      }),
    );

    const selected = ranked
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, filters.limit ?? 24);

    return Promise.all(
      selected.map((item: any) => {
        const {
          password_hash,
          iban,
          national_id,
          iqama_number,
          id_document_s3_key,
          national_address,
          ...safePro
        } = item.pro as any;
        return this.decorateProMedia({
          ...safePro,
          matched_service: item.service,
        });
      }),
    );
  }

  async onboardAccount(proId: string, dto: OnboardingAccountDto): Promise<Pro> {
    const pro = await this.findById(proId);

    const idNumber =
      dto.id_type === 'NATIONAL_ID' ? dto.national_id?.trim() : dto.iqama_number?.trim();

    if (!idNumber) {
      throw new BadRequestException(
        dto.id_type === 'NATIONAL_ID'
          ? 'Saudi ID is required.'
          : 'Iqama number is required.',
      );
    }

    const [identityCheck, addressCheck] = await Promise.all([
      this.saudiVerificationService.verifyIdentity({
        idType: dto.id_type,
        idNumber,
        phoneNumber: dto.phone_number,
      }),
      this.saudiVerificationService.verifyNationalAddress({
        idNumber,
        nationalAddress: dto.national_address,
      }),
    ]);

    const result = await this.db.update('pros', { pro_id: proId }, {
      id_type: dto.id_type,
      national_id: dto.id_type === 'NATIONAL_ID' ? idNumber : undefined,
      iqama_number: dto.id_type === 'IQAMA' ? idNumber : undefined,
      phone_number: dto.phone_number,
      national_address: dto.national_address,
      id_verified: identityCheck.status === 'VERIFIED',
      id_verification_provider: identityCheck.provider,
      id_verification_status: identityCheck.status,
      id_verification_reference: identityCheck.reference,
      national_address_verified: addressCheck.status === 'VERIFIED',
      national_address_verification_provider: addressCheck.provider,
      national_address_verification_status: addressCheck.status,
      national_address_verification_reference: addressCheck.reference,
      onboarding_step: Math.max(pro.onboarding_step || 1, 2),
      updated_at: Date.now(),
    });

    const { password_hash: _passwordHash, ...safe } = result as any;
    return safe as Pro;
  }

  async onboardMarketplace(proId: string, dto: OnboardingMarketplaceDto): Promise<Pro> {
    const pro = await this.findById(proId);

    if ((pro.onboarding_step || 1) < 2) {
      throw new BadRequestException('Complete account setup before marketplace setup.');
    }

    const now = Date.now();
    const normalizedStartingPrice = dto.contact_for_price ? undefined : dto.starting_price_sar;
    await this.deleteServicesByPro(proId);
    await this.deleteAvailabilityByPro(proId);

    for (const specificService of dto.services_offered) {
      await this.db.put('services', {
        pro_id: proId,
        service_id: uuidv4(),
        category: dto.service_category,
        title: specificService,
        description: dto.bio,
        pricing_type: 'QUOTE',
        min_price_sar:
          normalizedStartingPrice === undefined ? undefined : sarToHalalas(normalizedStartingPrice),
        max_price_sar:
          normalizedStartingPrice === undefined ? undefined : sarToHalalas(normalizedStartingPrice),
        vat_included: true,
        estimated_duration_minutes: 60,
        photos_s3_keys: [],
        is_active_created: `1#${now}`,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

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

    const existingWorkPhotoKeys = Array.isArray(dto.existing_work_photo_s3_keys)
      ? dto.existing_work_photo_s3_keys.filter(Boolean)
      : Array.isArray((pro as any).work_photo_s3_keys)
        ? ((pro as any).work_photo_s3_keys as string[]).filter(Boolean)
        : [];
    const uploadedWorkPhotoKeys = Array.isArray(dto.work_photo_s3_keys)
      ? dto.work_photo_s3_keys.filter(Boolean)
      : [];
    const uploadedWorkPhotoIds = Array.isArray(dto.work_photo_upload_ids)
      ? dto.work_photo_upload_ids.filter(Boolean)
      : [];
    const orderedWorkPhotoTokens = Array.isArray(dto.work_photo_order)
      ? dto.work_photo_order.filter(Boolean)
      : [];

    const existingKeySet = new Set(existingWorkPhotoKeys);
    const uploadedKeyById = new Map(
      uploadedWorkPhotoIds.map((uploadId, index) => [uploadId, uploadedWorkPhotoKeys[index]]),
    );
    const combinedWorkPhotoKeys =
      orderedWorkPhotoTokens.length > 0
        ? orderedWorkPhotoTokens.reduce<string[]>((orderedKeys, token) => {
            if (token.startsWith('existing:')) {
              const key = token.slice('existing:'.length);
              if (existingKeySet.has(key) && !orderedKeys.includes(key)) {
                orderedKeys.push(key);
              }
              return orderedKeys;
            }

            if (token.startsWith('new:')) {
              const uploadId = token.slice('new:'.length);
              const key = uploadedKeyById.get(uploadId);
              if (key && !orderedKeys.includes(key)) {
                orderedKeys.push(key);
              }
              return orderedKeys;
            }

            return orderedKeys;
          }, [])
        : [...existingWorkPhotoKeys, ...uploadedWorkPhotoKeys];

    const remainingExistingKeys = existingWorkPhotoKeys.filter(
      (key) => !combinedWorkPhotoKeys.includes(key),
    );
    const remainingUploadedKeys = uploadedWorkPhotoKeys.filter(
      (key) => !combinedWorkPhotoKeys.includes(key),
    );
    const finalWorkPhotoKeys = [
      ...combinedWorkPhotoKeys,
      ...remainingExistingKeys,
      ...remainingUploadedKeys,
    ];

    if (finalWorkPhotoKeys.length > 12) {
      throw new BadRequestException('You can upload up to 12 work photos.');
    }

    const existingMarketplaceProfile =
      (pro as any).marketplace_profile && typeof (pro as any).marketplace_profile === 'object'
        ? (pro as any).marketplace_profile
        : {};
    const resolvedProfilePhotoKey =
      dto.profile_photo_s3_key ||
      pro.profile_photo_s3_key ||
      existingMarketplaceProfile.profile_photo;
    const legacyBusinessHours = dto.availability.reduce<Record<string, any>>((hours, slot) => {
      const dayKeyMap: Record<string, string> = {
        SUN: 'sunday',
        MON: 'monday',
        TUE: 'tuesday',
        WED: 'wednesday',
        THU: 'thursday',
        FRI: 'friday',
        SAT: 'saturday',
      };
      const dayKey = dayKeyMap[slot.day_of_week];
      if (!dayKey) return hours;

      hours[dayKey] = {
        open: slot.is_available,
        from: slot.open_time,
        to: slot.close_time,
      };
      return hours;
    }, {});
    const nextMarketplaceProfile = {
      ...existingMarketplaceProfile,
      bio: dto.bio,
      profile_photo: resolvedProfilePhotoKey,
      service_category: dto.service_category,
      services_offered: dto.services_offered,
      property_types: dto.property_types,
      service_districts: dto.service_districts,
      service_cities:
        Array.isArray(existingMarketplaceProfile.service_cities) &&
        existingMarketplaceProfile.service_cities.length > 0
          ? existingMarketplaceProfile.service_cities
          : dto.service_districts,
      contact_for_price: Boolean(dto.contact_for_price),
      starting_price: normalizedStartingPrice,
      payment_methods: dto.payment_methods,
      years_experience: dto.years_experience,
      years_in_business: dto.years_experience,
      employee_count_range: dto.employee_count_range,
      employees: dto.employee_count_range,
      instagram: dto.instagram_handle,
      snapchat: dto.snapchat_handle,
      twitter: dto.twitter_handle,
      website: dto.website_url,
      license_type: dto.license_type,
      license_number: dto.license_number,
      cr_number: dto.cr_number,
      vat_number: dto.vat_number,
      portfolio_photos: finalWorkPhotoKeys,
      business_hours: legacyBusinessHours,
    };

    const result = await this.db.update('pros', { pro_id: proId }, {
      profile_photo_s3_key: resolvedProfilePhotoKey,
      bio: dto.bio,
      years_experience: dto.years_experience,
      employee_count_range: dto.employee_count_range,
      speaks_arabic: dto.speaks_arabic,
      speaks_english: dto.speaks_english,
      speaks_urdu: dto.speaks_urdu,
      speaks_hindi: dto.speaks_hindi,
      service_category: dto.service_category,
      services_offered: dto.services_offered,
      property_types: dto.property_types,
      payment_methods: dto.payment_methods,
      instagram_handle: dto.instagram_handle,
      snapchat_handle: dto.snapchat_handle,
      twitter_handle: dto.twitter_handle,
      website_url: dto.website_url,
      contact_for_price: Boolean(dto.contact_for_price),
      starting_price_sar:
        normalizedStartingPrice === undefined ? undefined : sarToHalalas(normalizedStartingPrice),
      work_photo_s3_keys: finalWorkPhotoKeys,
      license_type: dto.license_type,
      license_number: dto.license_number,
      cr_number: dto.cr_number,
      vat_number: dto.vat_number,
      city: 'Riyadh',
      service_districts: dto.service_districts,
      marketplace_profile: nextMarketplaceProfile,
      status: 'PENDING_REVIEW',
      onboarding_step: 5,
      is_available: false,
      updated_at: now,
    });

    const { password_hash: _passwordHash, ...safe } = result as any;
    return (await this.decorateProMedia(safe)) as Pro;
  }

  // Legacy steps kept for compatibility with older clients.
  async onboardIdentity(proId: string, dto: OnboardingIdentityDto): Promise<Pro> {
    const pro = await this.findById(proId);
    const updates: Record<string, any> = {
      onboarding_step: Math.max(pro.onboarding_step || 1, 2),
      updated_at: Date.now(),
    };
    if (dto.id_document_s3_key) updates.id_document_s3_key = dto.id_document_s3_key;
    if (dto.cr_number) updates.cr_number = dto.cr_number;
    if (dto.vat_number) updates.vat_number = dto.vat_number;

    const result = await this.db.update('pros', { pro_id: proId }, updates);
    const { password_hash: _passwordHash, ...safe } = result as any;
    return safe as Pro;
  }

  async onboardProfile(proId: string, dto: OnboardingProfileDto): Promise<Pro> {
    const pro = await this.findById(proId);
    if ((pro.onboarding_step || 1) < 2) {
      throw new BadRequestException('Complete account setup first.');
    }

    const result = await this.db.update('pros', { pro_id: proId }, {
      ...dto,
      onboarding_step: Math.max(pro.onboarding_step || 1, 3),
      updated_at: Date.now(),
    });
    const { password_hash: _passwordHash, ...safe } = result as any;
    return (await this.decorateProMedia(safe)) as Pro;
  }

  async onboardServices(proId: string, dto: OnboardingServicesDto): Promise<Pro> {
    const pro = await this.findById(proId);
    if ((pro.onboarding_step || 1) < 3) {
      throw new BadRequestException('Complete the profile step first.');
    }

    await this.deleteServicesByPro(proId);

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
        price_sar: svc.price_sar !== undefined ? sarToHalalas(svc.price_sar) : undefined,
        min_price_sar: svc.min_price_sar !== undefined ? sarToHalalas(svc.min_price_sar) : undefined,
        max_price_sar: svc.max_price_sar !== undefined ? sarToHalalas(svc.max_price_sar) : undefined,
        vat_included: svc.vat_included,
        estimated_duration_minutes: svc.estimated_duration_minutes,
        photos_s3_keys: [],
        is_active_created: `1#${now}`,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await this.db.update('pros', { pro_id: proId }, {
      onboarding_step: Math.max(pro.onboarding_step || 1, 4),
      updated_at: now,
    });
    const { password_hash: _passwordHash, ...safe } = result as any;
    return (await this.decorateProMedia(safe)) as Pro;
  }

  async onboardPayout(proId: string, dto: OnboardingPayoutDto): Promise<Pro> {
    const pro = await this.findById(proId);
    if ((pro.onboarding_step || 1) < 4) {
      throw new BadRequestException('Complete the services step first.');
    }

    await this.deleteAvailabilityByPro(proId);

    const now = Date.now();
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

    const result = await this.db.update('pros', { pro_id: proId }, {
      iban: dto.iban,
      bank_name: dto.bank_name,
      service_districts: dto.service_districts,
      onboarding_step: 5,
      status: 'PENDING_REVIEW',
      updated_at: now,
    });

    const { password_hash: _passwordHash, ...safe } = result as any;
    return (await this.decorateProMedia(safe)) as Pro;
  }

  private async decorateProMedia<T extends Record<string, any>>(pro: T): Promise<T & Record<string, any>> {
    if (!pro) return pro as T & Record<string, any>;

    const profilePhotoKey = typeof pro.profile_photo_s3_key === 'string' ? pro.profile_photo_s3_key : '';
    const workPhotoKeys = Array.isArray(pro.work_photo_s3_keys) ? pro.work_photo_s3_keys.filter(Boolean) : [];

    const [profilePhotoUrl, workPhotoUrls] = await Promise.all([
      profilePhotoKey ? this.s3Service.getDocumentUrl(profilePhotoKey).catch(() => profilePhotoKey) : Promise.resolve(undefined),
      workPhotoKeys.length > 0 ? this.s3Service.getDocumentUrls(workPhotoKeys).catch(() => workPhotoKeys) : Promise.resolve([]),
    ]);

    return {
      ...pro,
      profile_photo_url: profilePhotoUrl,
      work_photo_urls: workPhotoUrls,
    };
  }

  private async getServicesByPro(proId: string) {
    const { items } = await this.db.query(
      'services',
      'pro_id = :pro_id',
      undefined,
      { ':pro_id': proId },
    );
    return items as ProService[];
  }

  private async getAvailabilityByPro(proId: string) {
    const { items } = await this.db.query(
      'pro_availability',
      'pro_id = :pro_id',
      undefined,
      { ':pro_id': proId },
    );
    return items as ProAvailability[];
  }

  private async deleteServicesByPro(proId: string) {
    const services = await this.getServicesByPro(proId);
    await Promise.all(
      services.map((service) =>
        this.db.delete('services', { pro_id: proId, service_id: service.service_id }),
      ),
    );
  }

  private async deleteAvailabilityByPro(proId: string) {
    const availability = await this.getAvailabilityByPro(proId);
    await Promise.all(
      availability.map((slot) =>
        this.db.delete('pro_availability', {
          pro_id: proId,
          day_of_week: slot.day_of_week,
        }),
      ),
    );
  }

  private scoreSearch(service: Record<string, any>, rawQuery: string) {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return 0;

    const haystack = [
      service.title,
      service.description,
      service.title_ar,
      service.description_ar,
      CATEGORY_LABELS[service.category || ''] || service.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack) return 0;
    if (haystack === query) return 130;
    if (haystack.includes(query)) return 95;

    return query
      .split(/\s+/)
      .filter(Boolean)
      .reduce((score, token) => (haystack.includes(token) ? score + 18 : score), 0);
  }
}
