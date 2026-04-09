import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IdType, PreferredLanguage, RIYADH_DISTRICTS } from '@handycall/shared';

export class CustomerRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message: 'Password must be at least 8 characters and contain a letter and a number',
  })
  password: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(100)
  first_name?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @Matches(/^\+9665\d{8}$/, {
    message: 'Phone number must be a valid Saudi mobile number: +966XXXXXXXXX',
  })
  phone_number?: string;

  @IsOptional()
  @IsEnum(['NATIONAL_ID', 'IQAMA'] as const)
  id_type?: IdType;

  @ValidateIf((o) => o.id_type === 'NATIONAL_ID')
  @IsString()
  @Matches(/^\d{10}$/, { message: 'national_id must be exactly 10 digits' })
  national_id?: string;

  @ValidateIf((o) => o.id_type === 'IQAMA')
  @IsString()
  @Matches(/^\d{10}$/, { message: 'iqama_number must be exactly 10 digits' })
  iqama_number?: string;

  @IsOptional()
  @IsIn(RIYADH_DISTRICTS as unknown as string[], {
    message: 'district must be a valid Riyadh district',
  })
  district?: string;

  @IsOptional()
  @IsEnum(['ar', 'en'] as const)
  preferred_language?: PreferredLanguage;

  /** Must be true — PDPL Royal Decree M/19 requires explicit consent */
  @IsOptional()
  @IsBoolean()
  pdpl_consent?: boolean;

  @IsOptional()
  @IsNumber()
  pdpl_consent_at?: number;

  /** Separate opt-in for marketing — can be false */
  @IsOptional()
  @IsBoolean()
  marketing_consent?: boolean;
}
