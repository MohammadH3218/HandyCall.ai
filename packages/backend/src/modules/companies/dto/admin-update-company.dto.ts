import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsObject, IsOptional, IsString, Matches, IsNumber } from 'class-validator';
import { CompanyStatus, ServiceType, BusinessHours, CallHandlingMode } from '@handycall/shared';

export class AdminUpdateCompanyDto {
  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsEnum(ServiceType)
  service_type?: ServiceType;

  @IsOptional()
  @IsString()
  service_template_id?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format (+1234567890)' })
  phone_number?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  business_hours?: BusinessHours;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  schedule_overrides?: Array<{
    date: string; // YYYY-MM-DD
    closed?: boolean;
    segments?: Array<{ open: string; close: string }>;
  }>;

  @IsOptional()
  @IsNumber()
  appointment_duration_minutes?: number;

  @IsOptional()
  @IsNumber()
  slot_interval_minutes?: number;

  @IsOptional()
  @IsString()
  subscription_tier?: string;

  @IsOptional()
  @IsBoolean()
  calls_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sms_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  transfer_enabled?: boolean;

  @IsOptional()
  @IsString()
  transfer_number?: string;

  @IsOptional()
  @IsEnum(CallHandlingMode)
  call_handling_mode?: CallHandlingMode;

  // Calendar setup
  @IsOptional()
  @IsBoolean()
  calendar_setup_completed?: boolean;

  @IsOptional()
  @IsBoolean()
  schedule_setup_completed?: boolean;

  @IsOptional()
  @IsIn(['INTERNAL', 'EXTERNAL'])
  calendar_mode?: 'INTERNAL' | 'EXTERNAL';

  @IsOptional()
  @IsIn(['NONE', 'GOOGLE', 'MICROSOFT', 'APPLE'])
  calendar_provider?: 'NONE' | 'GOOGLE' | 'MICROSOFT' | 'APPLE';
}
