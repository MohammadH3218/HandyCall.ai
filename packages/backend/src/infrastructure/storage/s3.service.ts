import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service implements OnModuleInit {
  private client: S3Client;
  private recordingsBucket: string;
  private transcriptsBucket: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const region = this.configService.get<string>('AWS_REGION');

    this.client = new S3Client({ region });

    this.recordingsBucket = this.configService.get<string>('S3_BUCKET_RECORDINGS') || '';
    this.transcriptsBucket = this.configService.get<string>('S3_BUCKET_TRANSCRIPTS') || '';
  }

  async uploadRecording(
    companyId: string,
    callId: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    const key = `recordings/${companyId}/${callId}.mp3`;

    const command = new PutObjectCommand({
      Bucket: this.recordingsBucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        company_id: companyId,
        call_id: callId,
      },
    });

    await this.client.send(command);

    return this.getRecordingUrl(companyId, callId);
  }

  async getRecordingUrl(companyId: string, callId: string, expiresIn = 3600): Promise<string> {
    const key = `recordings/${companyId}/${callId}.mp3`;

    const command = new GetObjectCommand({
      Bucket: this.recordingsBucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async uploadTranscript(
    companyId: string,
    callId: string,
    transcript: any
  ): Promise<string> {
    const key = `transcripts/${companyId}/${callId}.json`;

    const command = new PutObjectCommand({
      Bucket: this.transcriptsBucket,
      Key: key,
      Body: JSON.stringify(transcript),
      ContentType: 'application/json',
      Metadata: {
        company_id: companyId,
        call_id: callId,
      },
    });

    await this.client.send(command);

    return key;
  }

  async getTranscript(companyId: string, callId: string): Promise<any> {
    const key = `transcripts/${companyId}/${callId}.json`;

    const command = new GetObjectCommand({
      Bucket: this.transcriptsBucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const bodyContents = await response.Body?.transformToString();

    return bodyContents ? JSON.parse(bodyContents) : null;
  }

  async deleteRecording(companyId: string, callId: string): Promise<void> {
    const key = `recordings/${companyId}/${callId}.mp3`;

    const command = new DeleteObjectCommand({
      Bucket: this.recordingsBucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async recordingExists(companyId: string, callId: string): Promise<boolean> {
    const key = `recordings/${companyId}/${callId}.mp3`;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.recordingsBucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}
