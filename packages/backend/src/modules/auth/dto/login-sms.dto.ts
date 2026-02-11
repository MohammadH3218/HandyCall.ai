import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginSmsDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
