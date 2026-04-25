import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IdType } from '@handycall/shared';

export class OnboardingAccountDto {
  @IsEnum(['NATIONAL_ID', 'IQAMA'] as const)
  id_type: IdType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'national_id must be exactly 10 digits' })
  national_id?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'iqama_number must be exactly 10 digits' })
  iqama_number?: string;

  @IsString()
  @Matches(/^\+9665\d{8}$/, {
    message: 'phone_number must be a valid Saudi mobile number: +9665XXXXXXXX',
  })
  phone_number: string;

  @IsString()
  @MaxLength(400)
  national_address: string;
}
