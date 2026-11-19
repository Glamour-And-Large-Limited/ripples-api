import type { ConfigService } from '@nestjs/config';
import { createEmailSender, SesEmailSender } from './ses-email-sender.js';
import { ConsoleEmailSender } from './email-sender.js';

describe('SES email sender', () => {
  it('sends the verification code from the configured address', async () => {
    const sent: unknown[] = [];
    const sender = new SesEmailSender({
      send: async (message) => {
        sent.push(message);
      },
    });

    await sender.sendOtp('ada@example.com', '123456');

    expect(sent).toEqual([
      {
        to: 'ada@example.com',
        subject: 'Your Ripples verification code',
        text: 'Your Ripples verification code is 123456. It expires in a few minutes.',
      },
    ]);
  });

  it('keeps the console sender until a from address is configured', () => {
    const config = {
      get: (key: string) => (key === 'SES_FROM_EMAIL' ? '  ' : 'eu-west-1'),
    };

    expect(createEmailSender(config as unknown as ConfigService)).toBeInstanceOf(
      ConsoleEmailSender,
    );
  });

  it('uses SES when a from address is configured', () => {
    const config = {
      get: (key: string) =>
        key === 'SES_FROM_EMAIL' ? 'noreply@ripples.test' : 'eu-west-1',
    };

    expect(createEmailSender(config as unknown as ConfigService)).toBeInstanceOf(
      SesEmailSender,
    );
  });
});
