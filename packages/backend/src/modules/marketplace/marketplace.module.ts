import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, S3Service],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
