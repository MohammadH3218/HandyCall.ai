import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserType } from '@handycall/shared';

export class OAuthExchangeDto {
  @IsEmail()
  email: string;

  @IsEnum(['CUSTOMER', 'PRO'] as const)
  user_type: UserType;

  @IsString()
  @MaxLength(50)
  provider: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  given_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  family_name?: string;
}
