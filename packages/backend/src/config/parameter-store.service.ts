import { Injectable } from '@nestjs/common';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

@Injectable()
export class ParameterStoreService {
  private ssmClient: SSMClient;
  private parameters: Map<string, string> = new Map();
  private isInitialized = false;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.ssmClient = new SSMClient({ region });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const env = process.env.NODE_ENV || 'development';
    const useSSM = process.env.USE_SSM_PARAMETERS === 'true' || env === 'production';

    if (!useSSM) {
      console.log('📝 Using local .env file (set USE_SSM_PARAMETERS=true to use Parameter Store)');
      this.isInitialized = true;
      return;
    }

    console.log('🔐 Loading configuration from AWS Systems Manager Parameter Store...');

    const parameterPath = `/handycall/${env}`;

    try {
      await this.loadParametersRecursive(parameterPath);
      console.log(`✅ Loaded ${this.parameters.size} parameters from ${parameterPath}`);
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to load parameters from SSM:', error);
      console.log('⚠️  Falling back to .env file');
      this.isInitialized = true;
    }
  }

  private async loadParametersRecursive(path: string, nextToken?: string): Promise<void> {
    const command = new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    });

    const response = await this.ssmClient.send(command);

    if (response.Parameters) {
      for (const param of response.Parameters) {
        if (param.Name && param.Value) {
          // Extract the key name from the path
          // e.g., /handycall/dev/JWT_SECRET -> JWT_SECRET
          const key = param.Name.replace(`${path}/`, '');
          this.parameters.set(key, param.Value);

          // Also set in process.env so ConfigService can pick it up
          process.env[key] = param.Value;
        }
      }
    }

    // Handle pagination
    if (response.NextToken) {
      await this.loadParametersRecursive(path, response.NextToken);
    }
  }

  get<T = string>(key: string, defaultValue?: T): T {
    // First check SSM parameters
    if (this.parameters.has(key)) {
      return this.parameters.get(key) as T;
    }

    // Fall back to process.env
    const envValue = process.env[key];
    if (envValue !== undefined) {
      return envValue as T;
    }

    // Return default value or undefined
    return defaultValue as T;
  }

  getOrThrow(key: string): string {
    const value = this.get(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(`Configuration key "${key}" is required but not found`);
    }
    return value;
  }

  async refreshParameters(): Promise<void> {
    this.isInitialized = false;
    this.parameters.clear();
    await this.initialize();
  }
}
