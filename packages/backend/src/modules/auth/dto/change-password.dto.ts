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

  @IsString()
  @IsOptional()
  @IsIn(['users', 'admin'])
  pool_type?: 'users' | 'admin';
}
