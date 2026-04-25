import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type VerificationResult = {
  provider: 'NAFATH' | 'SPL' | 'MANUAL_REVIEW';
  status: 'VERIFIED' | 'PENDING' | 'MANUAL_REVIEW' | 'FAILED';
  reference?: string;
  reason?: string;
};

@Injectable()
export class SaudiVerificationService {
  constructor(private readonly config: ConfigService) {}

  private shouldFallbackToManualReview(status: number, payload: Record<string, any>) {
    if (status === 401 || status === 403) return true;

    const message = [payload?.message, payload?.error, payload?.detail]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      message.includes('invalid token') ||
      message.includes('invalid or expired token') ||
      message.includes('expired token') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    );
  }

  async verifyIdentity(input: {
    idType: 'NATIONAL_ID' | 'IQAMA';
    idNumber: string;
    phoneNumber: string;
  }): Promise<VerificationResult> {
    const baseUrl = this.config.get<string>('NAFATH_API_BASE_URL');
    const token = this.config.get<string>('NAFATH_API_TOKEN');

    if (!baseUrl || !token) {
      return {
        provider: 'MANUAL_REVIEW',
        status: 'MANUAL_REVIEW',
        reason: 'Nafath credentials are not configured in this environment.',
      };
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/ExtNafath/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nationalId: input.idNumber,
          idType: input.idType,
          phoneNumber: input.phoneNumber,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
      if (!response.ok) {
        if (this.shouldFallbackToManualReview(response.status, payload)) {
          return {
            provider: 'MANUAL_REVIEW',
            status: 'MANUAL_REVIEW',
            reason: 'Nafath verification will be completed manually during admin review.',
          };
        }

        return {
          provider: 'NAFATH',
          status: 'FAILED',
          reason: payload?.message || 'Nafath verification failed.',
        };
      }

      return {
        provider: 'NAFATH',
        status: 'PENDING',
        reference:
          payload?.transactionId ||
          payload?.transaction_id ||
          payload?.reference ||
          undefined,
      };
    } catch (error: any) {
      return {
        provider: 'NAFATH',
        status: 'FAILED',
        reason: error?.message || 'Nafath verification failed.',
      };
    }
  }

  async verifyNationalAddress(input: {
    nationalAddress: string;
    idNumber: string;
  }): Promise<VerificationResult> {
    const baseUrl = this.config.get<string>('SPL_NATIONAL_ADDRESS_API_BASE_URL');
    const apiKey = this.config.get<string>('SPL_NATIONAL_ADDRESS_API_KEY');

    if (!baseUrl || !apiKey) {
      return {
        provider: 'MANUAL_REVIEW',
        status: 'MANUAL_REVIEW',
        reason: 'SPL National Address credentials are not configured in this environment.',
      };
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nationalAddress: input.nationalAddress,
          nationalId: input.idNumber,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
      if (!response.ok) {
        if (this.shouldFallbackToManualReview(response.status, payload)) {
          return {
            provider: 'MANUAL_REVIEW',
            status: 'MANUAL_REVIEW',
            reason:
              'National address verification will be completed manually during admin review.',
          };
        }

        return {
          provider: 'SPL',
          status: 'FAILED',
          reason: payload?.message || 'National address verification failed.',
        };
      }

      return {
        provider: 'SPL',
        status: payload?.verified === true ? 'VERIFIED' : 'PENDING',
        reference: payload?.reference || payload?.requestId || payload?.request_id,
      };
    } catch (error: any) {
      return {
        provider: 'SPL',
        status: 'FAILED',
        reason: error?.message || 'National address verification failed.',
      };
    }
  }
}
