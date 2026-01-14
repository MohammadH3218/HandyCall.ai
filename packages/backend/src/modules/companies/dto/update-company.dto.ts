import { IsString, IsOptional, IsObject, IsBoolean, IsNumber, IsIn } from 'class-validator';
import { BusinessHours } from '@handycall/shared';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  business_hours?: BusinessHours;

  @IsOptional()
  @IsBoolean()
  calls_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sms_enabled?: boolean;

  // AWS Connect fields
  @IsOptional()
  @IsString()
  connect_phone_number_id?: string;

  @IsOptional()
  @IsString()
  connect_phone_number?: string;

  @IsOptional()
  @IsString()
  connect_instance_id?: string;

  @IsOptional()
  @IsBoolean()
  use_simple_scheduling?: boolean;

  // Calendar setup
  @IsOptional()
  @IsBoolean()
  calendar_setup_completed?: boolean;

  @IsOptional()
  @IsIn(['INTERNAL', 'EXTERNAL'])
  calendar_mode?: 'INTERNAL' | 'EXTERNAL';

  @IsOptional()
  @IsIn(['NONE', 'GOOGLE', 'MICROSOFT', 'APPLE'])
  calendar_provider?: 'NONE' | 'GOOGLE' | 'MICROSOFT' | 'APPLE';

  @IsOptional()
  @IsObject()
  calendar_connection?: any;
}
