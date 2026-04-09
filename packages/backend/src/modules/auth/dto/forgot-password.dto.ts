import { IsEmail, IsEnum } from 'class-validator';
import { UserType } from '@handycall/shared';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsEnum(['CUSTOMER', 'PRO'] as const)
  user_type: UserType;
}
