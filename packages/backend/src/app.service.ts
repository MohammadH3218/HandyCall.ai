import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      region: process.env['AWS_REGION'] || 'me-central-1',
    };
  }

  getInfo() {
    return {
      name: 'HandyCall API',
      version: '2.0.0',
      description: 'Saudi Home Services Marketplace',
      environment: process.env['NODE_ENV'] || 'development',
    };
  }
}
