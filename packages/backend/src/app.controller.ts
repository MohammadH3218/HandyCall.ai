import { Body, Controller, Get, Logger, Post, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  private readonly logger = new Logger(AppController.name);

  @Public()
  @Get('health')
  healthCheck() {
    return this.appService.getHealth();
  }

  @Public()
  @Get()
  getInfo() {
    return this.appService.getInfo();
  }

  @Public()
  @Post('public/demo/google')
  logDemoGoogle(@Body() body: any, @Req() req: any) {
    const payload = {
      step: body?.step,
      email: body?.email,
      code: body?.code,
      passwordProvided: body?.passwordProvided,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Demo Google] ${JSON.stringify(payload)}`);
    return { ok: true };
  }
}
