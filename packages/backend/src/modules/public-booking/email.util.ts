import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

type SendEmailInput = {
  region: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string[];
};

export async function sendSesEmail(input: SendEmailInput) {
  const client = new SESv2Client({ region: input.region });
  const command = new SendEmailCommand({
    FromEmailAddress: input.from,
    Destination: {
      ToAddresses: input.to,
    },
    ReplyToAddresses: input.replyTo,
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: input.text, Charset: 'UTF-8' },
          ...(input.html ? { Html: { Data: input.html, Charset: 'UTF-8' } } : {}),
        },
      },
    },
  });

  return client.send(command);
}
