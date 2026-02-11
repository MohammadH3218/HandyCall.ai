import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifySmsCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @IsString()
  code!: string;
}
