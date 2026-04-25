import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { EmailModule } from '../email/email.module';
import { ProsModule } from '../pros/pros.module';

@Module({
  imports: [ConfigModule, EmailModule, ProsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
