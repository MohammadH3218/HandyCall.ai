import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { ParameterStoreModule } from './infrastructure/config/config.module';

// Common
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Core / utilities
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { EmailModule } from './modules/email/email.module';

// Auth
import { AuthModule } from './modules/auth/auth.module';

// Users
import { CustomersModule } from './modules/customers/customers.module';
import { ProsModule } from './modules/pros/pros.module';

// Marketplace
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { ProServicesModule } from './modules/pro-services/pro-services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PaymentsModule } from './modules/payments/payments.module';

// Platform
import { AdminModule } from './modules/admin/admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration — global, loaded first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infrastructure — global providers available everywhere
    DatabaseModule,
    StorageModule,
    ParameterStoreModule,

    // Core utilities
    SchedulingModule,
    EmailModule,

    // Feature modules
    AuthModule,
    CustomersModule,
    ProsModule,
    MarketplaceModule,
    ProServicesModule,
    BookingsModule,
    ReviewsModule,
    PaymentsModule,
    AdminModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
