import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../infrastructure/database/dynamodb.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';
import { sarToHalalas, ProService } from '@handycall/shared';

@Injectable()
export class ProServicesService {
  constructor(private db: DynamoDBService) {}

  async createService(proId: string, dto: CreateServiceDto): Promise<ProService> {
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
      // Composite key for category-active GSI: "1#<timestamp>" = active
      is_active: true,
      created_at: now,
      updated_at: now,
    } as any;

    await this.db.put('services', { ...service, is_active_created: `1#${now}` });
    return service;
  }

  async updateService(
    proId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<ProService> {
    const existing = await this.db.get('services', { pro_id: proId, service_id: serviceId });
    if (!existing) throw new NotFoundException('Service not found');
    if (existing.pro_id !== proId) throw new ForbiddenException();

    const updates: Record<string, any> = { updated_at: Date.now() };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.title_ar !== undefined) updates.title_ar = dto.title_ar;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.description_ar !== undefined) updates.description_ar = dto.description_ar;
    if (dto.price_sar !== undefined) updates.price_sar = sarToHalalas(dto.price_sar);
    if (dto.min_price_sar !== undefined) updates.min_price_sar = sarToHalalas(dto.min_price_sar);
    if (dto.max_price_sar !== undefined) updates.max_price_sar = sarToHalalas(dto.max_price_sar);
    if (dto.vat_included !== undefined) updates.vat_included = dto.vat_included;
    if (dto.estimated_duration_minutes !== undefined) {
      updates.estimated_duration_minutes = dto.estimated_duration_minutes;
    }

    const result = await this.db.update(
      'services',
      { pro_id: proId, service_id: serviceId },
      updates,
    );
    return result as ProService;
  }

  async deactivateService(proId: string, serviceId: string): Promise<{ success: boolean }> {
    const existing = await this.db.get('services', { pro_id: proId, service_id: serviceId });
    if (!existing) throw new NotFoundException('Service not found');
    if (existing.pro_id !== proId) throw new ForbiddenException();

    await this.db.update(
      'services',
      { pro_id: proId, service_id: serviceId },
      {
        is_active: false,
        is_active_created: `0#${existing.created_at}`,
        updated_at: Date.now(),
      },
    );
    return { success: true };
  }

  async listByPro(proId: string): Promise<ProService[]> {
    const { items } = await this.db.query(
      'services',
      '#pro_id = :pro_id',
      { '#pro_id': 'pro_id' },
      { ':pro_id': proId },
    );
    return items as ProService[];
  }

  async browse(filters: { category?: string; district?: string; limit?: number }): Promise<ProService[]> {
    const options: any = {
      filterExpression: '#is_active = :true',
      expressionAttributeNames: { '#is_active': 'is_active' },
      expressionAttributeValues: { ':true': true },
      limit: filters.limit ?? 20,
    };

    if (filters.category) {
      options.filterExpression += ' AND #category = :cat';
      options.expressionAttributeNames['#category'] = 'category';
      options.expressionAttributeValues[':cat'] = filters.category;
    }

    const { items } = await this.db.scan('services', options);
    return items as ProService[];
  }

  async findById(proId: string, serviceId: string): Promise<ProService> {
    const item = await this.db.get('services', { pro_id: proId, service_id: serviceId });
    if (!item) throw new NotFoundException('Service not found');
    return item as ProService;
  }
}
