import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private config: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      region: this.config.get('AWS_REGION', 'me-central-1'),
      environment: this.config.get('NODE_ENV', 'development'),
    };
  }

  getInfo() {
    return {
      name: 'HandyCall Saudi Marketplace API',
      version: '1.0.0',
      description: 'Home services marketplace for Saudi Arabia',
      region: 'Riyadh, Saudi Arabia',
    };
  }
}
