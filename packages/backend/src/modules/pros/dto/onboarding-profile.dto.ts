import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class OnboardingProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio_ar?: string;

  /** S3 key of profile photo — set by controller after upload */
  profile_photo_s3_key?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  years_experience?: number;

  @IsBoolean()
  speaks_arabic: boolean;

  @IsBoolean()
  speaks_english: boolean;

  @IsOptional()
  @IsBoolean()
  speaks_urdu?: boolean;

  @IsOptional()
  @IsBoolean()
  speaks_hindi?: boolean;
}
