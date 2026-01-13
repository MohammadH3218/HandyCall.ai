import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  company_id!: string;

  @IsOptional()
  @IsString()
  call_id?: string;

  @IsOptional()
  @IsString()
  contact_id?: string;

  // ISO 8601 date-time in UTC.
  @IsISO8601()
  start_time!: string;

  // ISO 8601 date-time in UTC.
  @IsISO8601()
  end_time!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsString()
  customer_name!: string;

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

