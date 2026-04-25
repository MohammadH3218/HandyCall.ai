import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class OnboardingAccountSetupDto {
  @IsOptional()
  @IsIn(['NATIONAL_ID', 'IQAMA'])
  id_type?: 'NATIONAL_ID' | 'IQAMA';

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'id_number must be exactly 10 digits' })
  id_number?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  national_address_short?: string;

  @IsOptional()
  @IsString()
  national_address_building?: string;

  @IsOptional()
  @IsString()
  national_address_street?: string;

  @IsOptional()
  @IsString()
  national_address_district?: string;

  @IsOptional()
  @IsString()
  national_address_city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  national_address_postal_code?: string;
}
