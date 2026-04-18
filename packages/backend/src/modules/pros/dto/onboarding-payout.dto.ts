import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Matches,
  ValidateNested,
  IsOptional,
  Matches as M,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek, RIYADH_DISTRICTS } from '@handycall/shared';

export class AvailabilitySlotDto {
  @IsIn(['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const)
  day_of_week: DayOfWeek;

  @Matches(/^\d{2}:\d{2}$/, { message: 'open_time must be HH:MM' })
  open_time: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'close_time must be HH:MM' })
  close_time: string;

  @IsBoolean()
  is_available: boolean;
}

export class OnboardingPayoutDto {
  /**
   * Saudi IBAN: "SA" followed by exactly 22 digits (total 24 characters).
   * Optional — payout banking will be collected separately.
   */
  @IsOptional()
  @Matches(/^SA\d{22}$/, {
    message: 'IBAN must be a valid Saudi IBAN: SA followed by 22 digits (24 chars total)',
  })
  iban?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service district is required' })
  @IsIn(RIYADH_DISTRICTS as unknown as string[], {
    each: true,
    message: 'Each district must be a valid Riyadh district',
  })
  service_districts: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one availability slot is required' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}
