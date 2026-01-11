import type { Context } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

type ConnectInvokeLambdaEvent = {
  Details?: {
    ContactData?: {
      ContactId?: string;
      InstanceARN?: string;
    };
    Parameters?: Record<string, string>;
  };
};

const region = process.env.AWS_REGION || 'us-east-1';
const queueUrl = process.env.QUEUE_URL;
const sqs = new SQSClient({ region });

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required value: ${name}`);
  return value;
}

export const handler = async (event: ConnectInvokeLambdaEvent, _context: Context): Promise<Record<string, string>> => {
  const params = event?.Details?.Parameters || {};

  const contactId = params.contactId || event?.Details?.ContactData?.ContactId || '';
  const streamArn = params.streamArn || params.streamARN || params.StreamARN || '';
  const startFragmentNumber =
    params.startFragmentNumber ||
    params.startFragment ||
    params.StartFragmentNumber ||
    '';

  const systemPhoneNumber = params.systemPhoneNumber || params.systemPhone || params.SystemPhoneNumber || '';
  const customerPhoneNumber = params.customerPhoneNumber || params.customerPhone || params.CustomerPhoneNumber || '';

  if (!queueUrl) {
    throw new Error('QUEUE_URL is not set');
  }

  const messageBody = JSON.stringify({
    contactId,
    streamArn,
    startFragmentNumber,
    systemPhoneNumber,
    customerPhoneNumber,
    receivedAt: Date.now(),
  });

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
    }),
  );

  return {
    ok: 'true',
    contactId: required(contactId, 'contactId'),
  };
};

