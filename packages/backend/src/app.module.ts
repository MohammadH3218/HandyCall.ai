import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProsModule } from './modules/pros/pros.module';
import { ProServicesModule } from './modules/pro-services/pro-services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { EmailModule } from './modules/email/email.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { ParameterStoreModule } from './infrastructure/config/config.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AdminCompanyOverrideAuditGuard } from './common/guards/admin-company-override-audit.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infrastructure (global)
    DatabaseModule,
    StorageModule,
    ParameterStoreModule,

    // Auth
    AuthModule,
    EmailModule,

    // Marketplace modules
    CustomersModule,
    ProsModule,
    ProServicesModule,
    BookingsModule,
    ReviewsModule,
    MarketplaceModule,

    // Platform
    PaymentsModule,
    AdminModule,
    DashboardModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdminCompanyOverrideAuditGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
