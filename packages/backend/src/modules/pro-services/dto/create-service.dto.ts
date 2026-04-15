import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceCategory, PricingType } from '@handycall/shared';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'AC_HVAC', 'PLUMBING', 'ELECTRICAL', 'PAINTING', 'CLEANING',
  'PEST_CONTROL', 'CARPENTRY', 'MOVING', 'APPLIANCE_REPAIR',
  'SATELLITE_DISH', 'LANDSCAPING', 'GENERAL_HANDYMAN',
];

const PRICING_TYPES: PricingType[] = ['FIXED', 'HOURLY', 'QUOTE'];

export class CreateServiceDto {
  @IsIn(SERVICE_CATEGORIES)
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

  @IsIn(PRICING_TYPES)
  pricing_type: PricingType;

  /** Price in SAR (user-facing). Stored as Halalas. Max 50,000 SAR. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  price_sar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  min_price_sar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  max_price_sar?: number;

  @IsBoolean()
  vat_included: boolean;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  estimated_duration_minutes?: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  price_sar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  min_price_sar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  max_price_sar?: number;

  @IsOptional()
  @IsBoolean()
  vat_included?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  estimated_duration_minutes?: number;
}
