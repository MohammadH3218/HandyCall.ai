import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class CallsService {
  constructor(private dynamodb: DynamoDBService) {}
}
