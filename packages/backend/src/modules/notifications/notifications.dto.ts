import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { NOTIFICATION_EVENT_KEYS, NotificationEventKey } from '@handycall/shared';

export class NotificationChannelPreferenceDto {
  @IsOptional()
  @IsBoolean()
  in_app?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelPreferenceDto)
  preferences!: Partial<Record<NotificationEventKey, NotificationChannelPreferenceDto>>;
}

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  device_id!: string;

  @IsIn(['IOS'])
  platform!: 'IOS';

  @IsString()
  @IsNotEmpty()
  apns_token!: string;

  @IsOptional()
  @IsIn(['sandbox', 'production'])
  apns_environment?: 'sandbox' | 'production';

  @IsOptional()
  @IsString()
  app_version?: string;

  @IsOptional()
  @IsString()
  device_model?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;
}

export class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  lastEvaluatedKey?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread_only?: boolean;
}

export class EventCatalogItemDto {
  @IsIn(NOTIFICATION_EVENT_KEYS)
  event_key!: NotificationEventKey;

  @IsString()
  label!: string;

  @IsString()
  category!: string;

  @IsString()
  description!: string;
}
