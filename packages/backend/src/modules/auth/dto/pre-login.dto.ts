import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class PreLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  @IsIn(['users', 'customer'])
  pool_type?: 'users' | 'customer';
}
