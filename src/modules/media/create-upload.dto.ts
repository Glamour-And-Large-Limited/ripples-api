import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  MAX_MEDIA_BYTES,
  MEDIA_PURPOSES,
  type MediaPurpose,
} from './media-key.js';

export class CreateUploadDto {
  @IsIn(MEDIA_PURPOSES)
  purpose: MediaPurpose;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contentType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fileName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MEDIA_BYTES)
  byteSize: number;
}
