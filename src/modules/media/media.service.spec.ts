import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service.js';

describe('MediaService', () => {
  const service = new MediaService({
    get: () => undefined,
  } as unknown as ConfigService);

  it('rejects a file type the purpose does not allow', async () => {
    await expect(
      service.createUpload('user-1', {
        purpose: 'listing-photo',
        contentType: 'video/mp4',
        fileName: 'tour.mp4',
        byteSize: 1024,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('reports that uploads are unavailable when the bucket is unset', async () => {
    await expect(
      service.createUpload('user-1', {
        purpose: 'listing-photo',
        contentType: 'image/jpeg',
        fileName: 'cover.jpg',
        byteSize: 1024,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('leaves local image paths unchanged when signing is unavailable', async () => {
    await expect(
      service.readableUrl('/images/design-system/home-property-01.png'),
    ).resolves.toBe('/images/design-system/home-property-01.png');
  });
});
