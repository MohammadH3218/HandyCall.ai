import { IsNotEmpty, IsOptional, IsString, IsIn, Length } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsString()
  @IsNotEmpty()
  pre_login_session!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;

  @IsOptional()
  @IsString()
  @IsIn(['users', 'customer'])
  pool_type?: 'users' | 'customer';
}
