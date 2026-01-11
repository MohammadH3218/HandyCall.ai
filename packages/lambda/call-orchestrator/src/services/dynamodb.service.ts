import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'handycall_prod_';

export class DynamoDBService {
  /**
   * Get a single item from DynamoDB
   */
  static async get(tableName: string, key: Record<string, any>): Promise<any> {
    const command = new GetCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      Key: key,
    });

    const result = await docClient.send(command);
    return result.Item;
  }

  /**
   * Put an item into DynamoDB
   */
  static async put(tableName: string, item: Record<string, any>): Promise<void> {
    const command = new PutCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      Item: item,
    });

    await docClient.send(command);
  }

  /**
   * Query items from DynamoDB
   */
  static async query(
    tableName: string,
    keyCondition: string,
    expressionValues: Record<string, any>,
    indexName?: string,
  ): Promise<any[]> {
    const command = new QueryCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues,
      ...(indexName && { IndexName: indexName }),
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  /**
   * Scan items from DynamoDB
   */
  static async scan(
    tableName: string,
    filterExpression?: string,
    expressionValues?: Record<string, any>,
    limit?: number,
  ): Promise<any[]> {
    const command = new ScanCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      ...(filterExpression && { FilterExpression: filterExpression }),
      ...(expressionValues && { ExpressionAttributeValues: expressionValues }),
      ...(limit && { Limit: limit }),
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  /**
   * Update an item in DynamoDB
   */
  static async update(
    tableName: string,
    key: Record<string, any>,
    updates: Record<string, any>,
  ): Promise<void> {
    const updateExpression = Object.keys(updates)
      .map((key, index) => `#attr${index} = :val${index}`)
      .join(', ');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key, index) => ({
        ...acc,
        [`#attr${index}`]: key,
      }),
      {},
    );

    const expressionAttributeValues = Object.values(updates).reduce(
      (acc, value, index) => ({
        ...acc,
        [`:val${index}`]: value,
      }),
      {},
    );

    const command = new UpdateCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      Key: key,
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await docClient.send(command);
  }
}
