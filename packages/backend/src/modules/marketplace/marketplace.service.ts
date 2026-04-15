import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { Pro, ProService, RIYADH_DISTRICTS } from '@handycall/shared';

@Injectable()
export class MarketplaceService {
  constructor(private db: DynamoDBService) {}

  /** Home page: featured active pros */
  async getFeaturedPros(limit = 8): Promise<Partial<Pro>[]> {
    const { items } = await this.db.scan('pros', {
      filterExpression: '#status = :active AND #is_available = :true',
      expressionAttributeNames: { '#status': 'status', '#is_available': 'is_available' },
      expressionAttributeValues: { ':active': 'ACTIVE', ':true': true },
      limit,
    });

    return items
      .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
      .map(({ password_hash, iban, national_id, iqama_number, id_document_s3_key, ...safe }: any) => safe);
  }

  /** Browse services by category, with optional district filter */
  async browseServices(filters: {
    category?: string;
    district?: string;
    limit?: number;
  }): Promise<ProService[]> {
    const expressionAttributeNames: Record<string, string> = { '#is_active': 'is_active' };
    const expressionAttributeValues: Record<string, any> = { ':true': true };
    let filterExpression = '#is_active = :true';

    if (filters.category) {
      filterExpression += ' AND #category = :cat';
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeValues[':cat'] = filters.category;
    }

    const { items } = await this.db.scan('services', {
      filterExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      limit: filters.limit ?? 20,
    });

    return items as ProService[];
  }

  /** List all supported Riyadh districts */
  getDistricts() {
    return { districts: RIYADH_DISTRICTS };
  }

  /** List all service categories with Arabic labels */
  getCategories() {
    return {
      categories: [
        { key: 'AC_HVAC', label_en: 'AC & HVAC', label_ar: 'تكييف وتبريد' },
        { key: 'PLUMBING', label_en: 'Plumbing', label_ar: 'سباكة' },
        { key: 'ELECTRICAL', label_en: 'Electrical', label_ar: 'كهرباء' },
        { key: 'PAINTING', label_en: 'Painting', label_ar: 'دهانات' },
        { key: 'CLEANING', label_en: 'Cleaning', label_ar: 'تنظيف' },
        { key: 'PEST_CONTROL', label_en: 'Pest Control', label_ar: 'مكافحة حشرات' },
        { key: 'CARPENTRY', label_en: 'Carpentry', label_ar: 'نجارة' },
        { key: 'MOVING', label_en: 'Moving', label_ar: 'نقل عفش' },
        { key: 'APPLIANCE_REPAIR', label_en: 'Appliance Repair', label_ar: 'إصلاح أجهزة' },
        { key: 'SATELLITE_DISH', label_en: 'Satellite & TV', label_ar: 'دش وتلفزيون' },
        { key: 'LANDSCAPING', label_en: 'Landscaping', label_ar: 'تنسيق حدائق' },
        { key: 'GENERAL_HANDYMAN', label_en: 'General Handyman', label_ar: 'أعمال عامة' },
      ],
    };
  }
}
