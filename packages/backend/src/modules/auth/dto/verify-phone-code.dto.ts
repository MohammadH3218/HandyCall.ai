import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn, Length } from 'class-validator';

export class VerifyPhoneCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @IsOptional()
  @IsString()
  @IsIn(['users', 'customer'])
  pool_type?: 'users' | 'customer';
}
