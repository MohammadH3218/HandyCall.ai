import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { DayOfWeek, RIYADH_DISTRICTS, ServiceCategory } from '@handycall/shared';

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

function parseBoolean(value: unknown, rawValue?: unknown) {
  const source = typeof rawValue === 'string' ? rawValue : value;

  if (typeof source === 'boolean') return source;
  if (typeof source === 'string') {
    if (source === 'true') return true;
    if (source === 'false') return false;
  }
  return source;
}

function parseAvailabilityArray(value: unknown) {
  const parsed = parseJsonArray(value);
  if (!Array.isArray(parsed)) return parsed;

  return parsed.map((item) => plainToInstance(MarketplaceAvailabilityDto, item));
}

export class MarketplaceAvailabilityDto {
  @IsEnum(['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const)
  day_of_week: DayOfWeek | 'FRI';

  @Matches(/^\d{2}:\d{2}$/, { message: 'open_time must be HH:MM' })
  open_time: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'close_time must be HH:MM' })
  close_time: string;

  @IsBoolean()
  @Transform(({ value, obj, key }) => parseBoolean(value, obj?.[key]))
  is_available: boolean;
}

export class OnboardingMarketplaceDto {
  profile_photo_s3_key?: string;
  work_photo_s3_keys?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Transform(({ value }) => parseJsonArray(value))
  work_photo_upload_ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Transform(({ value }) => parseJsonArray(value))
  work_photo_order?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Transform(({ value }) => parseJsonArray(value))
  existing_work_photo_s3_keys?: string[];

  @IsString()
  @MaxLength(1000)
  bio: string;

  @IsNumber()
  @Min(0)
  @Max(60)
  years_experience: number;

  @IsString()
  @MaxLength(80)
  employee_count_range: string;

  @IsBoolean()
  @Transform(({ value, obj, key }) => parseBoolean(value, obj?.[key]))
  speaks_arabic: boolean;

  @IsBoolean()
  @Transform(({ value, obj, key }) => parseBoolean(value, obj?.[key]))
  speaks_english: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj, key }) => parseBoolean(value, obj?.[key]))
  speaks_urdu?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj, key }) => parseBoolean(value, obj?.[key]))
  speaks_hindi?: boolean;

  @IsString()
  @MaxLength(120)
  service_category: ServiceCategory;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Transform(({ value }) => parseJsonArray(value))
  services_offered: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Transform(({ value }) => parseJsonArray(value))
  property_types: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(RIYADH_DISTRICTS as unknown as string[], {
    each: true,
    message: 'Each district must be a valid Riyadh district',
  })
  @Transform(({ value }) => parseJsonArray(value))
  service_districts: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj, key }) => parseBoolean(value, obj?.[key]))
  contact_for_price?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(50000)
  starting_price_sar?: number;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => parseJsonArray(value))
  payment_methods: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagram_handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  snapchat_handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  twitter_handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  license_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  license_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cr_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vat_number?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one availability slot is required' })
  @ValidateNested({ each: true })
  @Transform(({ value }) => parseAvailabilityArray(value))
  @Type(() => MarketplaceAvailabilityDto)
  availability: MarketplaceAvailabilityDto[];
}
