import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class GetAvailabilityDto {
  @IsString()
  company_id!: string;

  // ISO 8601 date-time in UTC.
  @IsISO8601()
  start_time!: string;

  // ISO 8601 date-time in UTC.
  @IsISO8601()
  end_time!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

