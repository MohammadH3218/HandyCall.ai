import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class ContactsService {
  constructor(private dynamodb: DynamoDBService) {}
}
