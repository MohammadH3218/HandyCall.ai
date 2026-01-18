import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJob,
} from '@aws-sdk/client-transcribe';
import { S3Service } from './s3.service';
import { TranscriptSegment } from '../types/s3.types';

const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || 'us-east-1' });

export class TranscribeService {
  /**
   * Start a transcription job for a recording
   */
  static async startTranscription(
    jobName: string,
    recordingBucket: string,
    recordingKey: string,
    outputBucket: string,
    mediaFormat: string,
  ): Promise<string> {
    const command = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: 'en-US',
      // Amazon Connect recordings are typically WAV, but Twilio exports MP3 by default.
      MediaFormat: mediaFormat,
      Media: {
        MediaFileUri: `s3://${recordingBucket}/${recordingKey}`,
      },
      OutputBucketName: outputBucket,
      Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 2, // Agent + Customer
        ChannelIdentification: false,
      },
    });

    const response = await transcribeClient.send(command);
    return response.TranscriptionJob?.TranscriptionJobName || jobName;
  }

  /**
   * Wait for transcription job to complete and get results
   */
  static async waitForTranscription(
    jobName: string,
    maxAttempts: number = 60,
    delayMs: number = 5000,
  ): Promise<TranscriptionJob> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });

      const response = await transcribeClient.send(command);
      const job = response.TranscriptionJob;

      if (!job) {
        throw new Error(`Transcription job ${jobName} not found`);
      }

      if (job.TranscriptionJobStatus === 'COMPLETED') {
        return job;
      }

      if (job.TranscriptionJobStatus === 'FAILED') {
        throw new Error(`Transcription job failed: ${job.FailureReason}`);
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(`Transcription job ${jobName} timed out after ${maxAttempts} attempts`);
  }

  /**
   * Download and parse transcription results
   */
  static async getTranscriptText(transcriptFileUri: string): Promise<{
    fullText: string;
    segments: TranscriptSegment[];
  }> {
    // Extract bucket and key from S3 URI
    const match = transcriptFileUri.match(/s3:\/\/([^/]+)\/(.+)/);
    if (!match) {
      throw new Error(`Invalid S3 URI: ${transcriptFileUri}`);
    }

    const [, bucket, key] = match;

    // Download transcript JSON
    const transcriptJson = await S3Service.downloadFile(bucket, key);
    const transcript = JSON.parse(transcriptJson);

    // Extract full text
    const fullText = transcript.results.transcripts[0]?.transcript || '';

    // Extract speaker segments
    const segments: TranscriptSegment[] = [];

    if (transcript.results.speaker_labels) {
      const speakerSegments = transcript.results.speaker_labels.segments || [];

      for (const segment of speakerSegments) {
        const speaker = segment.speaker_label === 'spk_0' ? 'AGENT' : 'CUSTOMER';
        const items = segment.items || [];
        const text = items.map((item: any) => item.content).join(' ');

        segments.push({
          speaker,
          text,
          startTime: parseFloat(segment.start_time),
          endTime: parseFloat(segment.end_time),
        });
      }
    }

    return { fullText, segments };
  }

  /**
   * Complete transcription workflow
   */
  static async transcribeRecording(
    callId: string,
    recordingBucket: string,
    recordingKey: string,
    outputBucket: string,
  ): Promise<{ fullText: string; segments: TranscriptSegment[] }> {
    const jobName = `handycall-${callId}-${Date.now()}`;

    const ext = (recordingKey.split('.').pop() || '').toLowerCase();
    const mediaFormat = ext === 'mp3' ? 'mp3' : ext === 'mp4' ? 'mp4' : 'wav';

    console.log(`Starting transcription job: ${jobName}`);
    await this.startTranscription(jobName, recordingBucket, recordingKey, outputBucket, mediaFormat);

    console.log(`Waiting for transcription to complete...`);
    const job = await this.waitForTranscription(jobName);

    if (!job.Transcript?.TranscriptFileUri) {
      throw new Error('Transcription completed but no transcript file URI found');
    }

    console.log(`Transcription complete, downloading results...`);
    return await this.getTranscriptText(job.Transcript.TranscriptFileUri);
  }
}
