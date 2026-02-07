import { IsObject, IsOptional, IsString } from 'class-validator';

export class PublicBookingRequestDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  preferred_date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  preferred_time?: string; // HH:mm (24h)

  @IsObject()
  @IsOptional()
  address?: { street?: string; city?: string; state?: string; zip?: string };

  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;
}

export class PublicBookingUpdateDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsObject()
  @IsOptional()
  address?: { street?: string; city?: string; state?: string; zip?: string };

  @IsObject()
  @IsOptional()
  custom_fields?: Record<string, any>;
}

export class PublicBookingRescheduleDto {
  @IsString()
  @IsOptional()
  preferred_date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  preferred_time?: string; // HH:mm (24h)
}

export class PublicBookingCancelDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PublicBookingAvailabilityDto {
  @IsString()
  @IsOptional()
  start_date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  end_date?: string; // YYYY-MM-DD
}
