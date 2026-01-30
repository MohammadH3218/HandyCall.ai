import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendBookingLinkDto {
  @IsString()
  @IsNotEmpty()
  company_id!: string;

  @IsString()
  @IsNotEmpty()
  call_id!: string;

  @IsString()
  @IsOptional()
  from_number?: string;

  @IsString()
  @IsOptional()
  to_number?: string;
}
