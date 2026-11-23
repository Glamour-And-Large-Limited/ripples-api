import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ListingPurpose, PropertyKind } from './property.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const asBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true';

export class PropertyCatalogQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  location?: string;

  @IsOptional()
  @IsIn(['house', 'apartment', 'land', 'commercial'])
  kind?: PropertyKind;

  @IsOptional()
  @IsIn(['sale', 'rent'])
  purpose?: ListingPurpose;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  minBedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  minBathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(asBoolean)
  @IsBoolean()
  verified?: boolean;
}
