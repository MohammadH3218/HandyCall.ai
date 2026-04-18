import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ProService, sarToHalalas } from '@handycall/shared';

@Injectable()
export class ProServicesService {
  constructor(private db: DynamoDBService) {}

  async listByCategory(category?: string, limit = 20): Promise<ProService[]> {
    if (category) {
      const { items } = await this.db.query(
        'services',
        '#cat = :cat AND begins_with(is_active_created, :active)',
        { '#cat': 'category' },
        { ':cat': category, ':active': '1#' },
        { indexName: 'category-active-index', limit },
      );
      return items as ProService[];
    }

    // No category filter — scan for active services
    const { items } = await this.db.scan('services', {
      filterExpression: 'is_active = :true',
      expressionAttributeValues: { ':true': true },
      limit,
    });
    return items as ProService[];
  }

  async listByPro(proId: string): Promise<ProService[]> {
    const { items } = await this.db.query(
      'services',
      'pro_id = :pro_id',
      undefined,
      { ':pro_id': proId },
    );
    return items as ProService[];
  }

  async findOne(proId: string, serviceId: string): Promise<ProService> {
    const item = await this.db.get('services', { pro_id: proId, service_id: serviceId });
    if (!item) throw new NotFoundException('Service not found');
    return item as ProService;
  }

  async create(proId: string, dto: CreateServiceDto): Promise<ProService> {
    const now = Date.now();
    const service: ProService = {
      pro_id: proId,
      service_id: uuidv4(),
      category: dto.category,
      title: dto.title,
      title_ar: dto.title_ar,
      description: dto.description,
      description_ar: dto.description_ar,
      pricing_type: dto.pricing_type,
      price_sar: dto.price_sar !== undefined ? sarToHalalas(dto.price_sar) : undefined,
      min_price_sar: dto.min_price_sar !== undefined ? sarToHalalas(dto.min_price_sar) : undefined,
      max_price_sar: dto.max_price_sar !== undefined ? sarToHalalas(dto.max_price_sar) : undefined,
      vat_included: dto.vat_included,
      estimated_duration_minutes: dto.estimated_duration_minutes,
      photos_s3_keys: [],
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    // Composite key for category-active GSI
    (service as any).is_active_created = `1#${now}`;

    await this.db.put('services', service);
    return service;
  }

  async update(proId: string, serviceId: string, dto: Partial<CreateServiceDto>): Promise<ProService> {
    const existing = await this.findOne(proId, serviceId);

    const updates: Record<string, any> = { updated_at: Date.now() };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.title_ar !== undefined) updates.title_ar = dto.title_ar;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.description_ar !== undefined) updates.description_ar = dto.description_ar;
    if (dto.pricing_type !== undefined) updates.pricing_type = dto.pricing_type;
    if (dto.price_sar !== undefined) updates.price_sar = sarToHalalas(dto.price_sar);
    if (dto.min_price_sar !== undefined) updates.min_price_sar = sarToHalalas(dto.min_price_sar);
    if (dto.max_price_sar !== undefined) updates.max_price_sar = sarToHalalas(dto.max_price_sar);
    if (dto.vat_included !== undefined) updates.vat_included = dto.vat_included;
    if (dto.estimated_duration_minutes !== undefined) updates.estimated_duration_minutes = dto.estimated_duration_minutes;

    const result = await this.db.update('services', { pro_id: proId, service_id: serviceId }, updates);
    return result as ProService;
  }

  /** Deactivate — never hard-delete service records */
  async deactivate(proId: string, serviceId: string): Promise<{ message: string }> {
    await this.findOne(proId, serviceId);
    const now = Date.now();
    await this.db.update('services', { pro_id: proId, service_id: serviceId }, {
      is_active: false,
      is_active_created: `0#${now}`,
      updated_at: now,
    });
    return { message: 'Service deactivated.' };
  }
}
