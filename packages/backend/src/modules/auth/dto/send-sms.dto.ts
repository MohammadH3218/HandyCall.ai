import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendSmsCodeDto {
  @IsNotEmpty()
  @IsString()
  phone_number!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}
