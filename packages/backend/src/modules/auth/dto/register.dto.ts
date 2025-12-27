import { IsEmail, IsString, MinLength, IsNotEmpty, IsEnum } from 'class-validator';
import { ServiceType } from '@handycall/shared';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  company_name!: string;

  @IsEnum(ServiceType)
  @IsNotEmpty()
  service_type!: ServiceType;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  phone_number!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  timezone!: string;
}
