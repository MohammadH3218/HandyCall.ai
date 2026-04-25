import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ProsService } from './pros.service';
import { OnboardingIdentityDto } from './dto/onboarding-identity.dto';
import { OnboardingProfileDto } from './dto/onboarding-profile.dto';
import { OnboardingServicesDto } from './dto/onboarding-services.dto';
import { OnboardingPayoutDto } from './dto/onboarding-payout.dto';
import { OnboardingAccountDto } from './dto/onboarding-account.dto';
import { OnboardingMarketplaceDto } from './dto/onboarding-marketplace.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { MarketplaceAuthContext } from '@handycall/shared';

@Controller('pros')
export class ProsController {
  constructor(
    private prosService: ProsService,
    private storageService: S3Service,
  ) {}

  /** Public: browse active pros (customer-facing) */
  @Public()
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
  @Get('me')
  async getMe(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.findById(user.user_id);
  }

  @Get('onboarding/status')
  async getOnboardingStatus(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.getOnboardingStatus(user.user_id);
  }

  /** Public: get a pro's public profile (for customer viewing) */
  @Public()
  @Get(':pro_id')
  async getPublicProfile(@Param('pro_id') proId: string) {
    return this.prosService.findPublicProfile(proId);
  }

  // ─── Onboarding Steps ────────────────────────────────────────────────────

  /** Step 1: Account setup */
  @Post('onboarding/account')
  async onboardAccount(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingAccountDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.onboardAccount(user.user_id, dto);
  }

  /** Step 2: Marketplace setup */
  @Post('onboarding/marketplace')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profile_photo', maxCount: 1 },
      { name: 'work_photos', maxCount: 12 },
    ]),
  )
  async onboardMarketplace(
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

    return this.prosService.onboardMarketplace(user.user_id, dto);
  }

  /** Step 2: Upload identity document */
  @Post('onboarding/identity')
  @UseInterceptors(FileInterceptor('id_document'))
  async onboardIdentity(
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

    return this.prosService.onboardIdentity(user.user_id, dto);
  }

  /** Step 3: Profile info + photo */
  @Post('onboarding/profile')
  @UseInterceptors(FileInterceptor('profile_photo'))
  async onboardProfile(
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

    return this.prosService.onboardProfile(user.user_id, dto);
  }

  /** Step 4: Service listings */
  @Post('onboarding/services')
  async onboardServices(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingServicesDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.onboardServices(user.user_id, dto);
  }

  /** Step 5: Payout & coverage — completes onboarding */
  @Post('onboarding/payout')
  async onboardPayout(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingPayoutDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.onboardPayout(user.user_id, dto);
  }
}
