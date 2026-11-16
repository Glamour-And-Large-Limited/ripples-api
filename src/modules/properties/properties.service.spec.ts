import { NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PROPERTY_SEEDS } from './properties.seed.js';
import { PropertiesService, toPropertyResponse } from './properties.service.js';
import { Property } from './property.entity.js';
import { SavedProperty } from './saved-property.entity.js';

const firstSeed = PROPERTY_SEEDS[0];

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: firstSeed.id,
    slug: firstSeed.slug,
    title: firstSeed.title,
    location: firstSeed.location,
    area: firstSeed.area,
    purpose: firstSeed.purpose,
    kind: firstSeed.kind,
    subtype: firstSeed.subtype,
    price: firstSeed.price,
    paymentFrequency: firstSeed.paymentFrequency ?? null,
    bedrooms: firstSeed.bedrooms ?? null,
    bathrooms: firstSeed.bathrooms ?? null,
    toilets: firstSeed.toilets ?? null,
    floorArea: firstSeed.floorArea,
    landArea: firstSeed.landArea ?? null,
    parkingSpaces: firstSeed.parkingSpaces ?? null,
    condition: firstSeed.condition,
    furnishing: firstSeed.furnishing,
    yearBuilt: firstSeed.yearBuilt ?? null,
    images: firstSeed.images,
    verification: firstSeed.verification,
    partnerVerified: firstSeed.partnerVerified,
    availability: firstSeed.availability,
    postedAgo: firstSeed.postedAgo,
    confirmedAgo: firstSeed.confirmedAgo ?? null,
    titleDocument: firstSeed.titleDocument ?? null,
    documentVerification: firstSeed.documentVerification ?? null,
    description: firstSeed.description,
    negotiable: firstSeed.negotiable,
    recommendedReason: firstSeed.recommendedReason ?? null,
    sortOrder: firstSeed.sortOrder,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ensureId() {},
    ...overrides,
  };
}

describe('toPropertyResponse', () => {
  it('formats the price and keeps the seeded relative dates', () => {
    const response = toPropertyResponse(property());

    expect(response.priceLabel).toBe('₦4,200,000');
    expect(response.postedAgo).toBe('5 days ago');
    expect(response.confirmedAgo).toBe('2 days ago');
    expect(response.slug).toBe('property-1');
  });

  it('omits empty optional fields', () => {
    const response = toPropertyResponse(
      property({
        paymentFrequency: null,
        confirmedAgo: null,
        recommendedReason: null,
      }),
    );

    expect(response).not.toHaveProperty('paymentFrequency');
    expect(response).not.toHaveProperty('confirmedAgo');
    expect(response).not.toHaveProperty('recommendedReason');
  });
});

describe('PropertiesService catalog', () => {
  it('returns the public catalog in sort order', async () => {
    const rows = [property(), property({ slug: 'property-2', sortOrder: 2 })];
    const service = createService({
      properties: {
        find: async () => rows,
      },
    });

    const catalog = await service.findAll();

    expect(catalog).toHaveLength(2);
    expect(catalog.map((item) => item.slug)).toEqual([
      'property-1',
      'property-2',
    ]);
    expect(catalog[0]?.priceLabel).toBe('₦4,200,000');
  });
});

describe('PropertiesService save', () => {
  it('does not insert a second row when the listing is already saved', async () => {
    const save = vi.fn();
    const service = createService({
      properties: {
        findOne: async () => property(),
      },
      saved: {
        findOne: async () => ({ id: 'saved-1' }) as SavedProperty,
        save,
      },
    });

    const saved = await service.save('user-1', firstSeed.id);

    expect(saved.id).toBe(firstSeed.id);
    expect(save).not.toHaveBeenCalled();
  });

  it('treats a unique constraint race as a successful save', async () => {
    const service = createService({
      properties: {
        findOne: async () => property(),
      },
      saved: {
        findOne: async () => null,
        save: async () => {
          throw new QueryFailedError(
            'insert',
            [],
            Object.assign(new Error('23505'), { code: '23505' }),
          );
        },
      },
    });

    await expect(service.save('user-1', firstSeed.id)).resolves.toMatchObject({
      id: firstSeed.id,
    });
  });

  it('rejects a save for an unknown property', async () => {
    const service = createService({
      properties: {
        findOne: async () => null,
      },
    });

    await expect(service.save('user-1', firstSeed.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function createService(overrides: {
  properties?: Record<string, unknown>;
  saved?: Record<string, unknown>;
}) {
  const properties = {
    count: async () => 1,
    find: async () => [],
    findOne: async () => null,
    findBy: async () => [],
    save: async () => [],
    create: (row: Partial<Property>) => row,
    ...overrides.properties,
  };
  const saved = {
    find: async () => [],
    findOne: async () => null,
    save: async () => ({}),
    create: (row: Partial<SavedProperty>) => row,
    delete: async () => ({ affected: 1 }),
    ...overrides.saved,
  };

  return new PropertiesService(properties as never, saved as never);
}
