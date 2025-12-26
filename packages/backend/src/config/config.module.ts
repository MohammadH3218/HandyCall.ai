import { Module, Global, DynamicModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ParameterStoreService } from './parameter-store.service';

@Global()
@Module({})
export class AppConfigModule implements OnModuleInit {
  constructor(private parameterStoreService: ParameterStoreService) {}

  async onModuleInit() {
    await this.parameterStoreService.initialize();
  }

  static forRoot(): DynamicModule {
    return {
      module: AppConfigModule,
      imports: [
        NestConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          ignoreEnvFile: process.env.USE_SSM_PARAMETERS === 'true',
        }),
      ],
      providers: [ParameterStoreService, ConfigService],
      exports: [ParameterStoreService, ConfigService],
    };
  }
}
