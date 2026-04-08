import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomerProfilesModule } from '../customer-profiles/customer-profiles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CognitoService } from './cognito.service';
import { SmsService } from './sms.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => UsersModule),
    CompaniesModule,
    CustomerProfilesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') + 's',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CognitoService, SmsService, JwtStrategy, AdminJwtStrategy, CustomerJwtStrategy],
  exports: [PassportModule, JwtStrategy, AdminJwtStrategy, CustomerJwtStrategy, AuthService, CognitoService],
})
export class AuthModule {}
