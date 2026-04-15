import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  pro_id: string;

  @IsString()
  service_id: string;

  @IsNumber()
  @Min(Date.now() - 1000) // must be in the future (validated in service)
  scheduled_start: number;

  @IsNumber()
  scheduled_end: number;

  @IsString()
  address_district: string;

  @IsOptional()
  @IsString()
  address_detail?: string;

  @IsOptional()
  @IsString()
  address_notes?: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
