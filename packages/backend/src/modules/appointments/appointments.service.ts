import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';

@Injectable()
export class AppointmentsService {
  constructor(private dynamodb: DynamoDBService) {}
}
