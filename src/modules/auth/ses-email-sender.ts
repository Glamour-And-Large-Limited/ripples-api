import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailSender, type EmailSender } from './email-sender.js';

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

export interface SesMailClient {
  send(message: OutboundEmail): Promise<void>;
}

export class SesEmailSender implements EmailSender {
  constructor(private readonly mail: SesMailClient) {}

  async send(message: OutboundEmail): Promise<void> {
    await this.mail.send(message);
  }

  async sendOtp(email: string, code: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Ripples verification code',
      text: `Your Ripples verification code is ${code}. It expires in a few minutes.`,
    });
  }
}

export function createEmailSender(config: ConfigService): EmailSender {
  const fromAddress = config.get<string>('SES_FROM_EMAIL')?.trim() ?? '';
  if (!fromAddress) {
    return new ConsoleEmailSender();
  }

  const region = config.get<string>('AWS_REGION')?.trim() || 'eu-west-1';
  const client = new SESv2Client({ region });
  return new SesEmailSender({
    async send(message) {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: fromAddress,
          Destination: { ToAddresses: [message.to] },
          Content: {
            Simple: {
              Subject: { Data: message.subject, Charset: 'UTF-8' },
              Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
            },
          },
        }),
      );
    },
  });
}
