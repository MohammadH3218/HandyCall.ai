import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'handycall_prod_';

export class DynamoDBService {
  /**
   * Get a single item by key
   */
  static async get(tableName: string, key: Record<string, any>): Promise<any> {
    const command = new GetCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      Key: key,
    });

    const result = await docClient.send(command);
    return result.Item || null;
  }

  /**
   * Put an item
   */
  static async put(tableName: string, item: Record<string, any>): Promise<void> {
    const command = new PutCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      Item: item,
    });

    await docClient.send(command);
  }

  /**
   * Update an item
   */
  static async update(
    tableName: string,
    key: Record<string, any>,
    updates: Record<string, any>,
  ): Promise<void> {
    const updateExpression = Object.keys(updates)
      .map((k) => `#${k} = :${k}`)
      .join(', ');

    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, k) => ({ ...acc, [`#${k}`]: k }),
      {},
    );

    const expressionAttributeValues = Object.keys(updates).reduce(
      (acc, k) => ({ ...acc, [`:${k}`]: updates[k] }),
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

  /**
   * Query items
   */
  static async query(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    indexName?: string,
  ): Promise<any[]> {
    const command = new QueryCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  /**
   * Scan items with filter
   */
  static async scan(
    tableName: string,
    filterExpression: string,
    expressionAttributeValues: Record<string, any>,
  ): Promise<any[]> {
    const command = new ScanCommand({
      TableName: `${TABLE_PREFIX}${tableName}`,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }
}
