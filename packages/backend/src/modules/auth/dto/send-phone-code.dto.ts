import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class SendPhoneCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  @IsIn(['users', 'customer'])
  pool_type?: 'users' | 'customer';
}
