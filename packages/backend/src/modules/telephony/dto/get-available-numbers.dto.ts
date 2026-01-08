import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class GetAvailableNumbersDto {
  @IsOptional()
  @IsString()
  country?: string; // ISO country code, default: 'US'

  @IsOptional()
  @IsString()
  type?: string; // Phone number type, default: 'DID'

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxResults?: number; // Max results to return, default: 10
}
