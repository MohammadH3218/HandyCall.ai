/**
 * Amazon Connect Lambda event types
 */

export interface ConnectContactFlowEvent {
  Details: {
    ContactData: {
      Attributes: Record<string, string>;
      Channel: string;
      ContactId: string;
      CustomerEndpoint: {
        Address: string;
        Type: string;
      };
      InitialContactId: string;
      InitiationMethod: string;
      InstanceARN: string;
      PreviousContactId: string;
      Queue: null | {
        ARN: string;
        Name: string;
      };
      SystemEndpoint: {
        Address: string;
        Type: string;
      };
      MediaStreams: {
        Customer: {
          Audio: {
            StreamARN: string;
            StartTimestamp: string;
            StartFragmentNumber: string;
          };
        };
      };
    };
    Parameters: Record<string, string>;
  };
  Name: string;
}

export interface ConnectResponse {
  response: string;
  timestamp: string;
}

export interface Company {
  company_id: string;
  company_name: string;
  phone_number: string;
  email: string;
  service_type: string;
  status: string;
  timezone: string;
  business_hours?: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface AgentConfig {
  company_id: string;
  ai_assistant_name?: string;
  greeting_tone: string;
  custom_greeting?: string;
  can_discuss_pricing: boolean;
  can_handle_emergencies: boolean;
  booking_mode: 'LEAD_CAPTURE' | 'CALENDAR' | 'INTERNAL';
  escalation_threshold: number;
  max_conversation_turns: number;
  languages: string[];
  created_at: number;
  updated_at: number;
}

export interface Contact {
  company_id: string;
  contact_id: string;
  phone_number: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  lead_status: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface Call {
  company_id: string;
  call_id: string;
  contact_id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  from_number: string;
  to_number: string;
  status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER';
  ai_handled: boolean;
  started_at: number;
  ended_at?: number;
  duration_seconds?: number;
  recording_url?: string;
  transcript_url?: string;
  summary?: string;
  sentiment?: string;
  created_at: number;
  updated_at: number;
}
