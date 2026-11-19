import { randomUUID } from 'node:crypto';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUploadDto } from './create-upload.dto.js';
import {
  isAllowedContentType,
  listingMediaKey,
  MAX_MEDIA_BYTES,
} from './media-key.js';

const uploadTtlSeconds = 300;
const readTtlSeconds = 60 * 60;

@Injectable()
export class MediaService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  async createUpload(userId: string, input: CreateUploadDto) {
    if (!isAllowedContentType(input.purpose, input.contentType)) {
      throw new UnprocessableEntityException('This file type is not allowed.');
    }
    if (input.byteSize > MAX_MEDIA_BYTES) {
      throw new UnprocessableEntityException(
        'Each file must be 50 MB or smaller.',
      );
    }

    const bucket = this.bucket();
    const key = listingMediaKey(
      userId,
      input.purpose,
      input.contentType,
      randomUUID(),
    );
    const uploadUrl = await getSignedUrl(
      this.s3(),
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.byteSize,
      }),
      { expiresIn: uploadTtlSeconds },
    );

    return {
      key,
      uploadUrl,
      headers: { 'Content-Type': input.contentType },
    };
  }

  async readableUrl(value: string): Promise<string> {
    if (!value.startsWith('media/') || !this.configured()) return value;
    return getSignedUrl(
      this.s3(),
      new GetObjectCommand({ Bucket: this.bucket(), Key: value }),
      { expiresIn: readTtlSeconds },
    );
  }

  private configured(): boolean {
    return Boolean(this.bucketName() && this.region());
  }

  private bucket(): string {
    if (!this.configured()) {
      throw new ServiceUnavailableException(
        'Media uploads are not configured.',
      );
    }
    return this.bucketName();
  }

  private bucketName(): string {
    return this.config.get<string>('S3_MEDIA_BUCKET')?.trim() ?? '';
  }

  private region(): string {
    return this.config.get<string>('AWS_REGION')?.trim() ?? '';
  }

  private s3(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: this.region(),
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
  }
}
