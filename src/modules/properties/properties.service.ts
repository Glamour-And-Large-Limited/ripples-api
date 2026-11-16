import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isUniqueViolation } from '../../utils/is-unique-violation.js';
import { PROPERTY_SEEDS, type PropertySeed } from './properties.seed.js';
import { Property } from './property.entity.js';
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
    return rows.map((row) => toPropertyResponse(row));
  }

  async findBySlug(slug: string): Promise<PropertyResponse> {
    const row = await this.properties.findOne({ where: { slug } });
    if (!row) throw new NotFoundException('Property not found');
    return toPropertyResponse(row);
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
    return saved.flatMap((item) => {
      const property = byId.get(item.propertyId);
      return property ? [toPropertyResponse(property)] : [];
    });
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
    return toPropertyResponse(property);
  }

  async unsave(userId: string, propertyId: string): Promise<void> {
    await this.requireProperty(propertyId);
    await this.savedProperties.delete({ userId, propertyId });
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
