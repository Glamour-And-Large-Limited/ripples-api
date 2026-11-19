import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../utils/is-unique-violation.js';
import { MediaService } from '../media/media.service.js';
import { ownedImageKeys } from '../media/media-key.js';
import { CreateListingDto } from './create-listing.dto.js';
import { PROPERTY_SEEDS, type PropertySeed } from './properties.seed.js';
import { Property, type PropertyKind } from './property.entity.js';
import { SavedProperty } from './saved-property.entity.js';

export type PropertyResponse = {
  id: string;
  slug: string;
  title: string;
  location: string;
  area: string;
  purpose: Property['purpose'];
  kind: Property['kind'];
  subtype: string;
  price: number;
  priceLabel: string;
  paymentFrequency?: Property['paymentFrequency'];
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  floorArea: number;
  landArea?: number;
  parkingSpaces?: number;
  condition: string;
  furnishing: string;
  yearBuilt?: number;
  images: string[];
  imageKeys?: string[];
  verification: Property['verification'];
  partnerVerified: boolean;
  availability: Property['availability'];
  postedAgo: string;
  confirmedAgo?: string;
  titleDocument?: string;
  documentVerification?: Property['documentVerification'];
  description: string;
  negotiable: boolean;
  recommendedReason?: string;
};

@Injectable()
export class PropertiesService implements OnModuleInit {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    @InjectRepository(SavedProperty)
    private readonly savedProperties: Repository<SavedProperty>,
    private readonly media: MediaService,
  ) {}

  async onModuleInit() {
    const count = await this.properties.count();
    if (count > 0) {
      return;
    }

    await this.properties.save(
      PROPERTY_SEEDS.map((seed) => this.properties.create(toPropertyRow(seed))),
    );
    this.logger.log(`Seeded ${PROPERTY_SEEDS.length} properties`);
  }

  async findAll(): Promise<PropertyResponse[]> {
    const rows = await this.properties.find({
      order: { sortOrder: 'ASC', slug: 'ASC' },
    });
    return Promise.all(rows.map((row) => this.present(row)));
  }

  async findBySlug(slug: string): Promise<PropertyResponse> {
    const row = await this.properties.findOne({ where: { slug } });
    if (!row) throw new NotFoundException('Property not found');
    return this.present(row);
  }

  async listSaved(userId: string): Promise<PropertyResponse[]> {
    const saved = await this.savedProperties.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (saved.length === 0) return [];

    const rows = await this.properties.findBy({
      id: In(saved.map((item) => item.propertyId)),
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const responses = await Promise.all(
      saved.map(async (item) => {
        const property = byId.get(item.propertyId);
        return property ? this.present(property) : null;
      }),
    );
    return responses.filter((item): item is PropertyResponse => item !== null);
  }

  async save(userId: string, propertyId: string): Promise<PropertyResponse> {
    const property = await this.requireProperty(propertyId);
    const existing = await this.savedProperties.findOne({
      where: { userId, propertyId },
    });
    if (!existing) {
      try {
        await this.savedProperties.save(
          this.savedProperties.create({ userId, propertyId }),
        );
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    return this.present(property);
  }

  async unsave(userId: string, propertyId: string): Promise<void> {
    await this.requireProperty(propertyId);
    await this.savedProperties.delete({ userId, propertyId });
  }

  async createListing(
    userId: string,
    input: CreateListingDto,
  ): Promise<PropertyResponse> {
    const slug = await this.allocateSlug(input.title);
    const saved = await this.properties.save(
      this.properties.create({
        ...listingColumns(input),
        slug,
        ownerUserId: userId,
        furnishing: 'Not specified',
        images: ownedImageKeys(userId, input.images ?? []),
        verification: 'pending',
        partnerVerified: false,
        postedAgo: 'Just now',
        documentVerification: input.ownershipDocument?.trim()
          ? 'pending'
          : null,
        sortOrder: 0,
      }),
    );
    return this.present(saved);
  }

  async updateListing(
    userId: string,
    slug: string,
    input: CreateListingDto,
  ): Promise<PropertyResponse> {
    const row = await this.properties.findOne({ where: { slug } });
    if (!row) throw new NotFoundException('Property not found');
    if (!row.ownerUserId || row.ownerUserId !== userId) {
      throw new ForbiddenException('You cannot update this listing');
    }

    const columns = listingColumns(input);
    if (input.images !== undefined) {
      columns.images = ownedImageKeys(userId, input.images);
    }
    const saved = await this.properties.save(
      this.properties.merge(row, columns),
    );
    return this.present(saved);
  }

  private async present(row: Property): Promise<PropertyResponse> {
    const response = toPropertyResponse(row);
    const imageKeys = row.images.filter((image) =>
      image.startsWith('media/listings/'),
    );
    return {
      ...response,
      images: await Promise.all(
        row.images.map((image) => this.media.readableUrl(image)),
      ),
      ...(imageKeys.length > 0 ? { imageKeys } : {}),
    };
  }

  private async allocateSlug(title: string): Promise<string> {
    const base = listingSlugBase(title);
    const suffix = randomBytes(3).toString('hex');
    let slug = `${base}-${suffix}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await this.properties.findOne({ where: { slug } });
      if (!existing) return slug;
      slug = `${slug}-${randomBytes(2).toString('hex')}`;
    }

    throw new ConflictException('Could not allocate a listing slug');
  }

  private async requireProperty(propertyId: string): Promise<Property> {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
}

export function formatPriceLabel(price: number): string {
  return `₦${new Intl.NumberFormat('en-US').format(price)}`;
}

export function toPropertyResponse(property: Property): PropertyResponse {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    location: property.location,
    area: property.area,
    purpose: property.purpose,
    kind: property.kind,
    subtype: property.subtype,
    price: property.price,
    priceLabel: formatPriceLabel(property.price),
    ...optional('paymentFrequency', property.paymentFrequency),
    ...optional('bedrooms', property.bedrooms),
    ...optional('bathrooms', property.bathrooms),
    ...optional('toilets', property.toilets),
    floorArea: property.floorArea,
    ...optional('landArea', property.landArea),
    ...optional('parkingSpaces', property.parkingSpaces),
    condition: property.condition,
    furnishing: property.furnishing,
    ...optional('yearBuilt', property.yearBuilt),
    images: property.images,
    verification: property.verification,
    partnerVerified: property.partnerVerified,
    availability: property.availability,
    postedAgo: property.postedAgo,
    ...optional('confirmedAgo', property.confirmedAgo),
    ...optional('titleDocument', property.titleDocument),
    ...optional('documentVerification', property.documentVerification),
    description: property.description,
    negotiable: property.negotiable,
    ...optional('recommendedReason', property.recommendedReason),
  };
}

const propertyKinds = {
  House: 'house',
  Apartment: 'apartment',
  Land: 'land',
  Commercial: 'commercial',
} as const satisfies Record<CreateListingDto['propertyType'], PropertyKind>;

export function listingSlugBase(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'listing';
}

function publicDocumentName(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('media/')) return value;
  return value.split('/').pop() || value;
}

function listingColumns(input: CreateListingDto): Partial<Property> {
  const ownershipDocument = input.ownershipDocument?.trim() || null;
  return {
    title: input.title.trim(),
    location: [input.estateName, input.cityArea, input.state]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(', '),
    area: input.cityArea.trim(),
    purpose: input.purpose,
    kind: propertyKinds[input.propertyType],
    subtype: input.propertySubtype.trim(),
    price: input.askingPrice,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    floorArea: input.floorArea,
    condition: input.condition.trim(),
    description: input.description.trim(),
    negotiable: input.negotiable,
    availability:
      input.currentAvailability.trim().toLowerCase() === 'available now'
        ? 'available'
        : 'unavailable',
    titleDocument: publicDocumentName(ownershipDocument),
    listingKind: input.listingKind,
    partnerType: input.partnerType,
    submission: input.submission,
  };
}

function toPropertyRow(seed: PropertySeed): Partial<Property> {
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    location: seed.location,
    area: seed.area,
    purpose: seed.purpose,
    kind: seed.kind,
    subtype: seed.subtype,
    price: seed.price,
    paymentFrequency: seed.paymentFrequency ?? null,
    bedrooms: seed.bedrooms ?? null,
    bathrooms: seed.bathrooms ?? null,
    toilets: seed.toilets ?? null,
    floorArea: seed.floorArea,
    landArea: seed.landArea ?? null,
    parkingSpaces: seed.parkingSpaces ?? null,
    condition: seed.condition,
    furnishing: seed.furnishing,
    yearBuilt: seed.yearBuilt ?? null,
    images: seed.images,
    verification: seed.verification,
    partnerVerified: seed.partnerVerified,
    availability: seed.availability,
    postedAgo: seed.postedAgo,
    confirmedAgo: seed.confirmedAgo ?? null,
    titleDocument: seed.titleDocument ?? null,
    documentVerification: seed.documentVerification ?? null,
    description: seed.description,
    negotiable: seed.negotiable,
    recommendedReason: seed.recommendedReason ?? null,
    sortOrder: seed.sortOrder,
  };
}

function optional<Key extends string, Value>(
  key: Key,
  value: Value | null | undefined,
): Partial<Record<Key, Value>> {
  if (value === null || value === undefined) return {};
  return { [key]: value } as Partial<Record<Key, Value>>;
}
