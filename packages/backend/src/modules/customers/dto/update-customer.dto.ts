import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Max, Min } from 'class-validator';
import { PreferredLanguage, RIYADH_DISTRICTS } from '@handycall/shared';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @Matches(/^\+9665\d{8}$/, {
    message: 'Phone number must be a valid Saudi mobile number: +9665XXXXXXXX',
  })
  phone_number?: string;

  @IsOptional()
  @IsIn(RIYADH_DISTRICTS as unknown as string[], {
    message: 'district must be a valid Riyadh district',
  })
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address_line1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address_line2?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  address_latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  address_longitude?: number;

  @IsOptional()
  @IsEnum(['ar', 'en'] as const)
  preferred_language?: PreferredLanguage;

  @IsOptional()
  marketing_consent?: boolean;
}
