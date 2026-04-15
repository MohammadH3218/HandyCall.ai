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
import { Pro, sarToHalalas } from '@handycall/shared';

@Injectable()
export class ProsService {
  constructor(private db: DynamoDBService) {}

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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private assertOnboardingStep(pro: Pro, expectedStep: number) {
    if (pro.onboarding_step !== expectedStep) {
      throw new BadRequestException(
        `Onboarding step mismatch. Expected step ${expectedStep}, current step is ${pro.onboarding_step}.`,
      );
    }
  }
}
