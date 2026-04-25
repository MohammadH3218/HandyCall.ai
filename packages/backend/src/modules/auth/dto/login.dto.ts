import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { UserType } from '@handycall/shared';

type LoginUserType = UserType | 'ADMIN';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsIn(['CUSTOMER', 'PRO', 'ADMIN'] as const)
  user_type: LoginUserType;
}
