import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginVerifySmsDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  session!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
