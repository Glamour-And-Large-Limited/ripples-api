import { UnprocessableEntityException } from '@nestjs/common';
import {
  isAllowedContentType,
  isOwnedListingPhoto,
  listingMediaKey,
  ownedImageKeys,
} from './media-key.js';

const photoId = '11111111-1111-4111-8111-111111111111';

describe('listing media keys', () => {
  it('builds a key under the caller media prefix', () => {
    expect(
      listingMediaKey('user-1', 'listing-photo', 'image/jpeg', photoId),
    ).toBe(`media/listings/user-1/listing-photo/${photoId}.jpg`);
  });

  it('allows listing photos and floor-plan pdfs, and rejects video', () => {
    expect(isAllowedContentType('listing-photo', 'image/webp')).toBe(true);
    expect(isAllowedContentType('floor-plan', 'application/pdf')).toBe(true);
    expect(isAllowedContentType('listing-photo', 'video/mp4')).toBe(false);
    expect(isAllowedContentType('listing-photo', 'application/pdf')).toBe(
      false,
    );
  });

  it('accepts only the caller’s listing photos', () => {
    const key = `media/listings/user-1/listing-photo/${photoId}.png`;
    expect(isOwnedListingPhoto('user-1', key)).toBe(true);
    expect(isOwnedListingPhoto('user-2', key)).toBe(false);
    expect(
      isOwnedListingPhoto(
        'user-1',
        `media/listings/user-1/floor-plan/${photoId}.pdf`,
      ),
    ).toBe(false);
    expect(
      isOwnedListingPhoto(
        'user-1',
        `media/listings/user-1/listing-photo/../${photoId}.jpg`,
      ),
    ).toBe(false);
  });

  it('rejects a listing image the caller does not own', () => {
    expect(() =>
      ownedImageKeys('user-1', [
        `media/listings/other/listing-photo/${photoId}.jpg`,
      ]),
    ).toThrow(UnprocessableEntityException);
  });
});
