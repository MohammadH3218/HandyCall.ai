import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
