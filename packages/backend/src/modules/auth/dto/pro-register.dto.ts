import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IdType } from '@handycall/shared';

export class ProRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/, {
    message: 'Password must be at least 8 characters and contain a letter and a number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @Matches(/^\+9665\d{8}$/, {
    message: 'Phone number must be a valid Saudi mobile number: +966XXXXXXXXX',
  })
  phone_number: string;

  @IsEnum(['NATIONAL_ID', 'IQAMA'] as const)
  id_type: IdType;

  @ValidateIf((o) => o.id_type === 'NATIONAL_ID')
  @IsString()
  @Matches(/^\d{10}$/, { message: 'national_id must be exactly 10 digits' })
  national_id?: string;

  @ValidateIf((o) => o.id_type === 'IQAMA')
  @IsString()
  @Matches(/^\d{10}$/, { message: 'iqama_number must be exactly 10 digits' })
  iqama_number?: string;

  @IsNotEmpty()
  pdpl_consent: boolean;

  @IsNumber()
  pdpl_consent_at: number;

  marketing_consent: boolean;
}
