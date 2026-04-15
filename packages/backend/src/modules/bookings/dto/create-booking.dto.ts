import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { RIYADH_DISTRICTS } from '@handycall/shared';

export class CreateBookingDto {
  @IsString()
  pro_id: string;

  @IsString()
  service_id: string;

  @IsNumber()
  @IsPositive()
  scheduled_start: number;  // Unix ms

  @IsNumber()
  @IsPositive()
  scheduled_end: number;    // Unix ms

  @IsIn(RIYADH_DISTRICTS as unknown as string[], {
    message: 'address_district must be a valid Riyadh district',
  })
  address_district: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address_detail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address_notes?: string;
}
