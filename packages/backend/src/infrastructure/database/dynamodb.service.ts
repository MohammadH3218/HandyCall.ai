import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private readonly logger = new Logger(DynamoDBService.name);
  private client: DynamoDBDocumentClient;
  private rawClient: DynamoDBClient;
  private tablePrefix: string;

  constructor(private config: ConfigService) {
    const region = config.get('AWS_REGION', 'me-central-1');
    const endpoint = config.get<string>('DYNAMODB_ENDPOINT');

    const clientConfig: any = { region };
    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.credentials = {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'local'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'local'),
      };
    }

    this.rawClient = new DynamoDBClient(clientConfig);
    this.client = DynamoDBDocumentClient.from(this.rawClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tablePrefix = config.get('DYNAMODB_TABLE_PREFIX', '');
  }

  async onModuleInit() {
    // Log DynamoDB connection info on startup
    const endpoint = this.config.get<string>('DYNAMODB_ENDPOINT');
    if (endpoint) {
      this.logger.log(`DynamoDB using local endpoint: ${endpoint}`);
    } else {
      this.logger.log(`DynamoDB using AWS region: ${this.config.get('AWS_REGION', 'me-central-1')}`);
    }
  }

  private tableName(name: string): string {
    return this.tablePrefix ? `${this.tablePrefix}${name}` : name;
  }

  async get(table: string, key: Record<string, any>): Promise<Record<string, any> | null> {
    const result = await this.client.send(
      new GetCommand({ TableName: this.tableName(table), Key: key }),
    );
    return result.Item ?? null;
  }

  async put(table: string, item: Record<string, any>): Promise<void> {
    await this.client.send(
      new PutCommand({ TableName: this.tableName(table), Item: item }),
    );
  }

  async update(
    table: string,
    key: Record<string, any>,
    updates: Record<string, any>,
  ): Promise<Record<string, any>> {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (!entries.length) return key;

    const expressionParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    for (const [k, v] of entries) {
      const nameKey = `#${k}`;
      const valKey = `:${k}`;
      expressionParts.push(`${nameKey} = ${valKey}`);
      names[nameKey] = k;
      values[valKey] = v;
    }

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName(table),
        Key: key,
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes ?? {};
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    await this.client.send(
      new DeleteCommand({ TableName: this.tableName(table), Key: key }),
    );
  }

  async query(
    table: string,
    keyConditionExpression: string,
    expressionAttributeNames: Record<string, string>,
    expressionAttributeValues: Record<string, any>,
    options: {
      indexName?: string;
      filterExpression?: string;
      limit?: number;
      scanIndexForward?: boolean;
    } = {},
  ): Promise<{ items: Record<string, any>[]; lastKey?: Record<string, any> }> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName(table),
        IndexName: options.indexName,
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: options.limit,
        ScanIndexForward: options.scanIndexForward,
      }),
    );
    return { items: result.Items ?? [], lastKey: result.LastEvaluatedKey };
  }

  async scan(
    table: string,
    options: {
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, any>;
      limit?: number;
    } = {},
  ): Promise<{ items: Record<string, any>[]; lastKey?: Record<string, any> }> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName(table),
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        Limit: options.limit,
      }),
    );
    return { items: result.Items ?? [], lastKey: result.LastEvaluatedKey };
  }

  async batchWrite(
    table: string,
    puts: Record<string, any>[] = [],
    deletes: Record<string, any>[] = [],
  ): Promise<void> {
    const requests = [
      ...puts.map((item) => ({ PutRequest: { Item: item } })),
      ...deletes.map((key) => ({ DeleteRequest: { Key: key } })),
    ];

    // DynamoDB BatchWrite supports max 25 items per call
    for (let i = 0; i < requests.length; i += 25) {
      const batch = requests.slice(i, i + 25);
      await this.client.send(
        new BatchWriteCommand({
          RequestItems: { [this.tableName(table)]: batch },
        }),
      );
    }
  }
}
