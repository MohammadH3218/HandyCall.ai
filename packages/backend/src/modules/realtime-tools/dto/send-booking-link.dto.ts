import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendBookingLinkDto {
  @IsString()
  @IsNotEmpty()
  company_id!: string;

  @IsString()
  @IsNotEmpty()
  call_id!: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
