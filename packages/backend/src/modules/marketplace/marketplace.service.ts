import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { ServiceCategory, RIYADH_DISTRICTS } from '@handycall/shared';

@Injectable()
export class MarketplaceService {
  constructor(private db: DynamoDBService) {}

  /** Browse active services by category and/or district */
  async browseServices(params: {
    category?: ServiceCategory;
    district?: string;
    limit?: number;
  }) {
    let services: any[] = [];

    if (params.category) {
      const { items } = await this.db.query(
        'services',
        '#cat = :cat AND begins_with(is_active_created, :active)',
        { '#cat': 'category' },
        { ':cat': params.category, ':active': '1#' },
        { indexName: 'category-active-index', limit: params.limit ?? 20 },
      );
      services = items;
    } else {
      const { items } = await this.db.scan('services', {
        filterExpression: 'is_active = :true',
        expressionAttributeValues: { ':true': true },
        limit: params.limit ?? 20,
      });
      services = items;
    }

    return services;
  }

  /** Get all supported categories and districts for the browse UI */
  getSupportedFilters() {
    return {
      categories: [
        'AC_HVAC', 'PLUMBING', 'ELECTRICAL', 'PAINTING', 'CLEANING',
        'PEST_CONTROL', 'CARPENTRY', 'MOVING', 'APPLIANCE_REPAIR',
        'SATELLITE_DISH', 'LANDSCAPING', 'GENERAL_HANDYMAN',
      ] as ServiceCategory[],
      districts: RIYADH_DISTRICTS,
      city: 'Riyadh',
    };
  }
}
