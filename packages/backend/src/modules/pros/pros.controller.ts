import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ProsService } from './pros.service';
import { OnboardingIdentityDto } from './dto/onboarding-identity.dto';
import { OnboardingProfileDto } from './dto/onboarding-profile.dto';
import { OnboardingServicesDto } from './dto/onboarding-services.dto';
import { OnboardingPayoutDto } from './dto/onboarding-payout.dto';
import { OnboardingAccountDto } from './dto/onboarding-account.dto';
import { OnboardingMarketplaceDto } from './dto/onboarding-marketplace.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitPolicy } from '../../common/decorators/rate-limit.decorator';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { MarketplaceAuthContext } from '@handycall/shared';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOC_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);
const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const WORK_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const ID_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const imageUploadOptions = {
  limits: { fileSize: WORK_PHOTO_MAX_BYTES, files: 13 },
  fileFilter: (_req: any, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => {
    cb(null, IMAGE_MIME_TYPES.has(file.mimetype));
  },
};

const identityUploadOptions = {
  limits: { fileSize: ID_DOCUMENT_MAX_BYTES, files: 1 },
  fileFilter: (_req: any, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => {
    cb(null, DOC_MIME_TYPES.has(file.mimetype));
  },
};

@Controller('pros')
export class ProsController {
  constructor(
    private prosService: ProsService,
    private storageService: S3Service,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** Public: browse active pros (customer-facing) */
  @Public()
  @RateLimitPolicy('MARKETPLACE_SEARCH')
  @Get()
  async browse(
    @Query('district') district?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prosService.listForBrowsing({
      district,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** Pro: get own full profile */
  @RateLimitPolicy('USER_WRITE')
  @Get('me')
  async getMe(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.findById(user.user_id);
  }

  @RateLimitPolicy('USER_WRITE')
  @Get('onboarding/status')
  async getOnboardingStatus(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.getOnboardingStatus(user.user_id);
  }

  /** Public: get a pro's public profile (for customer viewing) */
  @Public()
  @RateLimitPolicy('MARKETPLACE_READ')
  @Get(':pro_id')
  async getPublicProfile(@Param('pro_id') proId: string) {
    return this.prosService.findPublicProfile(proId);
  }

  // ─── Onboarding Steps ────────────────────────────────────────────────────

  /** Step 1: Account setup */
  @RateLimitPolicy('USER_WRITE')
  @Post('onboarding/account')
  async onboardAccount(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingAccountDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.prosService.onboardAccount(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'ACCOUNT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'pro.onboarding_account_updated',
      target_type: 'pro',
      target_id: user.user_id,
      metadata: { id_type: dto.id_type },
    });
    return result;
  }

  /** Step 2: Marketplace setup */
  @Post('onboarding/marketplace')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profile_photo', maxCount: 1 },
      { name: 'work_photos', maxCount: 12 },
    ], imageUploadOptions),
  )
  @RateLimitPolicy('USER_UPLOAD')
  async onboardMarketplace(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingMarketplaceDto,
    @UploadedFiles()
    files?: {
      profile_photo?: any[];
      work_photos?: any[];
    },
    ) {
      if (user.user_type !== 'PRO') throw new ForbiddenException();
    const profilePhoto = files?.profile_photo?.[0];
    const workPhotos = Array.isArray(files?.work_photos) ? files.work_photos : [];

    if (profilePhoto && profilePhoto.size > PROFILE_PHOTO_MAX_BYTES) {
      throw new ForbiddenException('Profile photo exceeds the 5MB upload limit.');
    }

    if (profilePhoto) {
      const s3Key = await this.storageService.uploadFile(
        profilePhoto.buffer,
        `photos/${user.user_id}/${Date.now()}-${profilePhoto.originalname}`,
        profilePhoto.mimetype,
      );
      dto.profile_photo_s3_key = s3Key;
    }

    if (workPhotos.length > 0) {
      const uploadIds = Array.isArray(dto.work_photo_upload_ids) ? dto.work_photo_upload_ids : [];
      const uploadedKeys = await Promise.all(
        workPhotos.map((file, index) =>
          this.storageService.uploadFile(
            file.buffer,
            `photos/${user.user_id}/work/${Date.now()}-${index}-${file.originalname}`,
            file.mimetype,
          ),
        ),
      );
      dto.work_photo_s3_keys = uploadedKeys;

      if (uploadIds.length === uploadedKeys.length) {
        dto.work_photo_s3_keys = uploadIds.map((_, index) => uploadedKeys[index]);
      }
    }

    const result = await this.prosService.onboardMarketplace(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'MARKETPLACE',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'pro.marketplace_profile_updated',
      target_type: 'pro',
      target_id: user.user_id,
      metadata: {
        service_category: dto.service_category,
        work_photo_count: workPhotos.length,
        has_profile_photo: Boolean(profilePhoto),
      },
    });
    return result;
  }

  /** Step 2: Upload identity document */
  @Post('onboarding/identity')
  @UseInterceptors(FileInterceptor('id_document', identityUploadOptions))
  @RateLimitPolicy('USER_UPLOAD')
  async onboardIdentity(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingIdentityDto,
    @UploadedFile() file?: any,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();

    if (file) {
      // Upload ID document to S3 — stored in documents bucket, not public
      const s3Key = await this.storageService.uploadFile(
        file.buffer,
        `ids/${user.user_id}/${Date.now()}-${file.originalname}`,
        file.mimetype,
      );
      dto.id_document_s3_key = s3Key;
    }

    const result = await this.prosService.onboardIdentity(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'ACCOUNT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'pro.identity_document_updated',
      target_type: 'pro',
      target_id: user.user_id,
      metadata: { has_document: Boolean(file) },
    });
    return result;
  }

  /** Step 3: Profile info + photo */
  @Post('onboarding/profile')
  @UseInterceptors(FileInterceptor('profile_photo', imageUploadOptions))
  @RateLimitPolicy('USER_UPLOAD')
  async onboardProfile(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingProfileDto,
    @UploadedFile() file?: any,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();

    if (file) {
      const s3Key = await this.storageService.uploadFile(
        file.buffer,
        `photos/${user.user_id}/${Date.now()}-${file.originalname}`,
        file.mimetype,
      );
      dto.profile_photo_s3_key = s3Key;
    }

    const result = await this.prosService.onboardProfile(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'ACCOUNT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'pro.profile_details_updated',
      target_type: 'pro',
      target_id: user.user_id,
      metadata: { has_profile_photo: Boolean(file) },
    });
    return result;
  }

  /** Step 4: Service listings */
  @RateLimitPolicy('USER_WRITE')
  @Post('onboarding/services')
  async onboardServices(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingServicesDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.prosService.onboardServices(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'MARKETPLACE',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'pro.services_updated',
      target_type: 'pro',
      target_id: user.user_id,
      metadata: { service_count: dto.services?.length || 0 },
    });
    return result;
  }

  /** Step 5: Payout & coverage — completes onboarding */
  @RateLimitPolicy('USER_WRITE')
  @Post('onboarding/payout')
  async onboardPayout(
    @Req() req: Request,
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingPayoutDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    const result = await this.prosService.onboardPayout(user.user_id, dto);
    await this.auditLogs.logFromRequest(req, {
      category: 'ACCOUNT',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'pro.payout_updated',
      target_type: 'pro',
      target_id: user.user_id,
      metadata: {
        service_district_count: dto.service_districts?.length || 0,
        availability_count: dto.availability?.length || 0,
      },
    });
    return result;
  }
}
