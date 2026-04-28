import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ServiceCategory, PricingType } from '@handycall/shared';

export class CreateServiceDto {
  @IsString()
  @MaxLength(120)
  category: ServiceCategory;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title_ar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_ar?: string;

  @IsEnum(['FIXED', 'HOURLY', 'QUOTE'] as const)
  pricing_type: PricingType;

  /** Price in SAR (user input). Stored as Halalas (* 100). Max 50,000 SAR. */
  @ValidateIf((o) => o.pricing_type === 'FIXED' || o.pricing_type === 'HOURLY')
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(50000)
  price_sar?: number;

  @ValidateIf((o) => o.pricing_type === 'QUOTE')
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(50000)
  min_price_sar?: number;

  @ValidateIf((o) => o.pricing_type === 'QUOTE')
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(50000)
  max_price_sar?: number;

  @IsBoolean()
  vat_included: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimated_duration_minutes?: number;
}
