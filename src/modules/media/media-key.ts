import { UnprocessableEntityException } from '@nestjs/common';

export const MEDIA_PURPOSES = [
  'listing-photo',
  'floor-plan',
  'identity-document',
  'ownership-document',
] as const;

export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

const allowedTypes: Record<MediaPurpose, readonly string[]> = {
  'listing-photo': ['image/jpeg', 'image/png', 'image/webp'],
  'floor-plan': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'identity-document': ['image/jpeg', 'image/png', 'application/pdf'],
  'ownership-document': ['image/jpeg', 'image/png', 'application/pdf'],
};

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export function isAllowedContentType(
  purpose: MediaPurpose,
  contentType: string,
): boolean {
  return allowedTypes[purpose].includes(contentType);
}

export function listingMediaKey(
  userId: string,
  purpose: MediaPurpose,
  contentType: string,
  id: string,
): string {
  const extension = extensions[contentType];
  if (!extension) {
    throw new UnprocessableEntityException('This file type is not allowed.');
  }
  return `media/listings/${userId}/${purpose}/${id}${extension}`;
}

export function isOwnedListingPhoto(userId: string, key: string): boolean {
  const prefix = `media/listings/${userId}/listing-photo/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(rest);
}

export function ownedImageKeys(userId: string, keys: string[]): string[] {
  for (const key of keys) {
    if (!isOwnedListingPhoto(userId, key)) {
      throw new UnprocessableEntityException(
        'Listing images must be photos you uploaded.',
      );
    }
  }
  return keys;
}
