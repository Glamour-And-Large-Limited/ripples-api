import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type {
  ListingKind,
  ListingPurpose,
  PartnerType,
} from './property.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateListingDto {
  @IsIn(['owner', 'agent', 'agency', 'developer', 'manager'])
  partnerType: PartnerType;

  @IsIn(['individual', 'unit', 'development'])
  listingKind: ListingKind;

  @IsIn(['sale', 'rent'])
  purpose: ListingPurpose;

  @IsIn(['House', 'Apartment', 'Land', 'Commercial'])
  propertyType: 'House' | 'Apartment' | 'Land' | 'Commercial';

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  propertySubtype: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  bathrooms?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  floorArea: number;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  condition: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  state: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  cityArea: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  streetAddress?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  estateName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000_000)
  askingPrice: number;

  @IsBoolean()
  negotiable: boolean;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  currentAvailability: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ownershipDocument?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  images?: string[];

  @IsObject()
  submission: Record<string, Record<string, string>>;
}
