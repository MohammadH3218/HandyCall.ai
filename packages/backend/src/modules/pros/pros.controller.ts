import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProsService } from './pros.service';
import { OnboardingIdentityDto } from './dto/onboarding-identity.dto';
import { OnboardingProfileDto } from './dto/onboarding-profile.dto';
import { OnboardingServicesDto } from './dto/onboarding-services.dto';
import { OnboardingPayoutDto } from './dto/onboarding-payout.dto';
import { OnboardingAccountSetupDto } from './dto/onboarding-account-setup.dto';
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

  /** Pro: permanently delete own account and all associated data */
  @Delete('me/account')
  @HttpCode(HttpStatus.OK)
  async deleteMyAccount(@CurrentUser() user: MarketplaceAuthContext) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    await this.prosService.deleteAccount(user.user_id);
    return { message: 'Account permanently deleted.' };
  }

  /** Public: get a pro's public profile (for customer viewing) */
  @Public()
  @Get(':pro_id')
  async getPublicProfile(@Param('pro_id') proId: string) {
    return this.prosService.findPublicProfile(proId);
  }

  /** Pro: update own marketplace profile (post-onboarding, from dashboard) */
  @Patch('me/marketplace-profile')
  async updateMarketplaceProfile(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() body: Record<string, any>,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.updateMarketplaceProfile(user.user_id, body);
  }

  @Post('me/marketplace-media/presign')
  async createMarketplaceMediaUpload(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() body: { kind?: 'profile_photo' | 'work_photo'; content_type?: string; file_name?: string },
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.createMarketplaceMediaUpload(user.user_id, body);
  }

  // ─── Onboarding Steps ────────────────────────────────────────────────────

  /** Account setup: ID, phone, national address */
  @Post('onboarding/account-setup')
  async onboardAccountSetup(
    @CurrentUser() user: MarketplaceAuthContext,
    @Body() dto: OnboardingAccountSetupDto,
  ) {
    if (user.user_type !== 'PRO') throw new ForbiddenException();
    return this.prosService.onboardAccountSetup(user.user_id, dto);
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
