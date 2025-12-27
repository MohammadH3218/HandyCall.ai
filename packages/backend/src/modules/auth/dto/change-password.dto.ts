import { IsString, IsNotEmpty, MinLength, IsOptional, IsIn } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  new_password!: string;

  @IsString()
  @IsNotEmpty()
  session!: string;

  @IsOptional()
  @IsString()
  @IsIn(['users', 'admin'])
  pool_type?: 'users' | 'admin';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  company_name?: string; // Required for users pool, optional for admin pool

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_name?: string; // Optional for all pools

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  last_name?: string; // Optional for all pools
}
