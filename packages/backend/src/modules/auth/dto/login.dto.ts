import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserType } from '@handycall/shared';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsEnum(['CUSTOMER', 'PRO'] as const)
  user_type: UserType;
}
