import { IsString, IsOptional, IsObject, IsBoolean, IsNumber } from 'class-validator';
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

  // Cal.com fields
  @IsOptional()
  @IsBoolean()
  calcom_connected?: boolean;

  @IsOptional()
  @IsString()
  calcom_api_key?: string;

  @IsOptional()
  @IsString()
  calcom_username?: string;

  @IsOptional()
  @IsNumber()
  calcom_event_type_id?: number;

  @IsOptional()
  @IsBoolean()
  use_simple_scheduling?: boolean;
}
