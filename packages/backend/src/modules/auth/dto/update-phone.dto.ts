import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdatePhoneDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone_number!: string;

  @IsOptional()
  @IsString()
  @IsIn(['users', 'customer'])
  pool_type?: 'users' | 'customer';
}
