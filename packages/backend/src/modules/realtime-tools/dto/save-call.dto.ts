import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveCallDto {
  @IsString()
  @IsNotEmpty()
  company_id!: string;

  @IsString()
  @IsNotEmpty()
  call_id!: string;

  @IsString()
  @IsOptional()
  transcript?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsObject()
  @IsOptional()
  collected_info?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  duration_seconds?: number;
}

