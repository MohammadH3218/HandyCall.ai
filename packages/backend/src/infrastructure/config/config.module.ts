import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

/**
 * ParameterStoreModule — optionally loads secrets from AWS SSM Parameter Store.
 * In local dev (when SSM_PARAMETER_PATH is not set), this is a no-op.
 * In production, set SSM_PARAMETER_PATH=/handycall/prod to auto-load secrets.
 */
@Module({})
export class ParameterStoreModule implements OnModuleInit {
  private readonly logger = new Logger(ParameterStoreModule.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const path = this.config.get<string>('SSM_PARAMETER_PATH');
    if (!path) {
      this.logger.log('SSM_PARAMETER_PATH not set — skipping Parameter Store load (local dev)');
      return;
    }

    try {
      const region = this.config.get('AWS_REGION', 'me-central-1');
      const ssm = new SSMClient({ region });

      const result = await ssm.send(
        new GetParametersCommand({
          Names: [path],
          WithDecryption: true,
        }),
      );

      if (result.Parameters?.length) {
        this.logger.log(`Loaded ${result.Parameters.length} parameter(s) from SSM: ${path}`);
      }
    } catch (err) {
      this.logger.warn(`Could not load from SSM Parameter Store: ${(err as Error).message}`);
    }
  }
}
