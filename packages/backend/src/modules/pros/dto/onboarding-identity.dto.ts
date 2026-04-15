import { IsOptional, IsString, Matches } from 'class-validator';

export class OnboardingIdentityDto {
  /** S3 key of the uploaded ID document — set by controller after upload */
  id_document_s3_key?: string;

  /** Commercial Registration number (optional) */
  @IsOptional()
  @IsString()
  cr_number?: string;

  /** VAT registration number (optional, if VAT-registered) */
  @IsOptional()
  @IsString()
  vat_number?: string;
}
