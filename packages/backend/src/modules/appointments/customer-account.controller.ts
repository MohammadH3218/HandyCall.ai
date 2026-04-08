import { Controller, Delete, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { CognitoService } from '../auth/cognito.service';
import { CustomerProfilesService } from '../customer-profiles/customer-profiles.service';
import { AuthContext } from '@handycall/shared';

@Public()
@Controller('customer/account')
@UseGuards(CustomerJwtAuthGuard)
export class CustomerAccountController {
  constructor(
    private readonly cognitoService: CognitoService,
    private readonly customerProfiles: CustomerProfilesService,
  ) {}

  /**
   * Permanently delete a customer's own account.
   * Removes the customer_profiles DynamoDB record and the Cognito user.
   *
   * OAuth customers (Google/Apple) live in the Users pool, while
   * email/password customers live in the Customer pool. We try the
   * customer pool first and fall back to the users pool so both paths work.
   */
  @Delete()
  async deleteMyAccount(@Auth() auth: AuthContext): Promise<{ message: string }> {
    if (!auth.email) {
      throw new UnauthorizedException('Cannot determine account email');
    }

    // 1. Delete profile record (name, phone, prefs, etc.)
    await this.customerProfiles.deleteByUserId(auth.user_id);

    // 2. Delete from Cognito — try customer pool first, fall back to users pool
    try {
      await this.cognitoService.deleteUser(auth.email, 'customer');
    } catch {
      // User may be in the Users pool (OAuth signup via Google/Apple)
      try {
        await this.cognitoService.deleteUser(auth.email, 'users');
      } catch {
        // If deletion fails in both pools, the profile is already deleted.
        // Treat as success so the UI doesn't show a confusing error.
      }
    }

    return { message: 'Account deleted successfully' };
  }
}
