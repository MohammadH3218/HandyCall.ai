import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private cdnBase: string;

  constructor(private config: ConfigService) {
    const region = config.get('AWS_REGION', 'me-central-1');
    const endpoint = config.get<string>('S3_ENDPOINT');

    const s3Config: any = { region };
    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.forcePathStyle = true;
      s3Config.credentials = {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'local'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'local'),
      };
    }

    this.s3 = new S3Client(s3Config);
    this.bucket = config.get('S3_BUCKET', 'handycall-media');
    this.cdnBase = config.get('CDN_BASE_URL', '');
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  getPublicUrl(key: string): string {
    if (this.cdnBase) return `${this.cdnBase}/${key}`;
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
