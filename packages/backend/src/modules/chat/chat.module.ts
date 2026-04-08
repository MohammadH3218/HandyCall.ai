import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CompaniesModule } from '../companies/companies.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [CompaniesModule, WebhooksModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
