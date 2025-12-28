/**
 * AWS S3 Event Types
 */

export interface S3Event {
  Records: S3EventRecord[];
}

export interface S3EventRecord {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  s3: {
    s3SchemaVersion: string;
    configurationId: string;
    bucket: {
      name: string;
      arn: string;
    };
    object: {
      key: string;
      size: number;
      eTag: string;
      sequencer: string;
    };
  };
}

export interface CallHighlight {
  company_id: string;
  highlight_id: string;
  call_id: string;
  type: 'PRICING_DISCUSSED' | 'COMPLAINT' | 'APPOINTMENT_MENTIONED' | 'EMERGENCY' | 'ESCALATION_REQUESTED';
  content: string;
  timestamp?: number;
  created_at: number;
}

export interface TranscriptSegment {
  speaker: 'AGENT' | 'CUSTOMER';
  text: string;
  startTime?: number;
  endTime?: number;
}
