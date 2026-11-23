import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { CreateListingDto } from './create-listing.dto.js';
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
    ownerUserId: null,
    listingKind: null,
    partnerType: null,
    submission: null,
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

  it('omits the wizard submission from the public response', () => {
    const response = toPropertyResponse(
      property({
        submission: {
          verifyDetails: { email: 'ada@example.com' },
          amenities: { amenities: 'Backup power, Water supply' },
        },
      }),
    );

    expect(response).not.toHaveProperty('submission');
    expect(response).not.toHaveProperty('ownerUserId');
    expect(response.amenities).toEqual(['Backup power', 'Water supply']);
  });
});

describe('PropertiesService catalog', () => {
  it('returns submitted listings newest first with the poster name', async () => {
    const owned = property({
      ownerUserId: 'user-1',
      slug: 'lekki-terrace',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    });
    const builder = catalogBuilder([owned]);
    const service = createService({
      properties: {
        createQueryBuilder: () => builder,
      },
      users: {
        find: async () => [{ id: 'user-1', name: 'Ada Lovelace' }],
      },
    });

    const catalog = await service.findAll();

    expect(builder.clauses).toContain('property.ownerUserId IS NOT NULL');
    expect(builder.clauses).toContainEqual({
      column: 'property.createdAt',
      direction: 'DESC',
    });
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.slug).toBe('lekki-terrace');
    expect(catalog[0]?.postedBy).toBe('Ada Lovelace');
    expect(catalog[0]?.createdAt).toBe('2026-11-01T00:00:00.000Z');
    expect(catalog[0]?.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(catalog[0]?.partner).toEqual({
      id: 'user-1',
      name: 'Ada Lovelace',
      verified: firstSeed.partnerVerified,
      listingCount: 1,
    });
    expect(catalog[0]).not.toHaveProperty('ownerUserId');
  });

  it('applies location, type, price, and bedroom filters', async () => {
    const builder = catalogBuilder([]);
    const service = createService({
      properties: {
        createQueryBuilder: () => builder,
      },
    });

    await service.findAll({
      location: 'Lagos',
      kind: 'house',
      purpose: 'sale',
      minBedrooms: 3,
      minBathrooms: 2,
      minPrice: 25_000_000,
      maxPrice: 60_000_000,
      verified: true,
    });

    expect(builder.clauses).toContainEqual({
      sql: "(property.location ILIKE :location ESCAPE '\\' OR property.area ILIKE :location ESCAPE '\\')",
      params: { location: '%Lagos%' },
    });
    expect(builder.clauses).toContainEqual({
      sql: 'property.kind = :kind',
      params: { kind: 'house' },
    });
    expect(builder.clauses).toContainEqual({
      sql: 'property.bedrooms >= :minBedrooms',
      params: { minBedrooms: 3 },
    });
    expect(builder.clauses).toContainEqual({
      sql: 'property.verification = :verification',
      params: { verification: 'verified' },
    });
  });

  it('matches a country against that country and its states', async () => {
    const builder = catalogBuilder([]);
    const service = createService({
      properties: {
        createQueryBuilder: () => builder,
      },
      places: {
        namesFor: async () => ['Nigeria', 'Lagos'],
      },
    });

    await service.findAll({ location: 'Nigeria' });

    expect(builder.clauses).toContainEqual({
      sql: "(property.location ILIKE :location0 ESCAPE '\\' OR property.area ILIKE :location0 ESCAPE '\\') OR (property.location ILIKE :location1 ESCAPE '\\' OR property.area ILIKE :location1 ESCAPE '\\')",
      params: { location0: '%Nigeria%', location1: '%Lagos%' },
    });
  });
});

describe('PropertiesService partner profile', () => {
  it('returns the poster and the listings they submitted', async () => {
    const owned = property({
      ownerUserId: 'user-1',
      slug: 'lekki-terrace',
      partnerVerified: false,
    });
    const service = createService({
      properties: {
        find: async () => [owned],
      },
      users: {
        findOne: async () => ({
          id: 'user-1',
          name: 'Ada Lovelace',
          location: 'Lagos',
        }),
      },
    });

    const profile = await service.partnerProfile('user-1');

    expect(profile).toMatchObject({
      id: 'user-1',
      name: 'Ada Lovelace',
      location: 'Lagos',
      verified: false,
      listingCount: 1,
    });
    expect(profile.listings[0]?.slug).toBe('lekki-terrace');
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('phone');
  });

  it('rejects a partner with no submitted listings', async () => {
    const service = createService({
      properties: { find: async () => [] },
      users: {
        findOne: async () => ({
          id: 'user-1',
          name: 'Ada Lovelace',
          location: null,
        }),
      },
    });

    await expect(service.partnerProfile('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
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

describe('PropertiesService listings', () => {
  it('maps a wizard submission onto the public listing', async () => {
    const saved: Array<Partial<Property>> = [];
    const service = createService({
      properties: {
        findOne: async () => null,
        save: async (row: Partial<Property>) => {
          saved.push(row);
          return property({
            ...row,
            id: 'created-1',
            slug: row.slug ?? 'lekki-terrace-abc123',
          });
        },
      },
    });

    const created = await service.createListing('user-1', listingInput());

    expect(created.kind).toBe('house');
    expect(created.purpose).toBe('sale');
    expect(created.title).toBe('Lekki Terrace');
    expect(created.location).toBe('Palm Estate, Lekki, Lagos');
    expect(created.area).toBe('Lekki');
    expect(created.price).toBe(25_000_000);
    expect(created.negotiable).toBe(true);
    expect(created.availability).toBe('available');
    expect(created.verification).toBe('pending');
    expect(created.partnerVerified).toBe(false);
    expect(created.furnishing).toBe('Furnished');
    expect(created.images).toEqual([]);
    expect(created.postedAgo).toBe('Just now');
    expect(created.titleDocument).toBe('deed.pdf');
    expect(created).not.toHaveProperty('submission');
    expect(saved[0]).toMatchObject({
      ownerUserId: 'user-1',
      listingKind: 'development',
      partnerType: 'developer',
      submission: listingInput().submission,
    });
    expect(saved[0]?.slug).toMatch(/^lekki-terrace-[a-f0-9]+$/);
  });

  it('adds another suffix when the first slug is already taken', async () => {
    const lookups: string[] = [];
    let savedSlug = '';
    const service = createService({
      properties: {
        findOne: async ({ where }: { where: { slug: string } }) => {
          lookups.push(where.slug);
          return lookups.length === 1 ? property({ slug: where.slug }) : null;
        },
        save: async (row: Partial<Property>) => {
          savedSlug = row.slug ?? '';
          return property({ ...row, id: 'created-2', slug: savedSlug });
        },
      },
    });

    await service.createListing('user-1', listingInput());

    expect(lookups).toHaveLength(2);
    expect(savedSlug.startsWith(`${lookups[0]}-`)).toBe(true);
  });

  it('stores uploaded photo keys and signs them on read', async () => {
    const key =
      'media/listings/user-1/listing-photo/11111111-1111-4111-8111-111111111111.jpg';
    const saved: Array<Partial<Property>> = [];
    const service = createService({
      properties: {
        findOne: async () => null,
        save: async (row: Partial<Property>) => {
          saved.push(row);
          return property({
            ...row,
            id: 'created-1',
            slug: row.slug ?? 'lekki-terrace-abc123',
          });
        },
      },
    });

    const created = await service.createListing('user-1', {
      ...listingInput(),
      images: [key],
    });

    expect(saved[0]?.images).toEqual([key]);
    expect(created.imageKeys).toEqual([key]);
    expect(created.images).toEqual([key]);
  });

  it('rejects a photo key owned by someone else', async () => {
    const service = createService({
      properties: {
        findOne: async () => null,
      },
    });

    await expect(
      service.createListing('user-1', {
        ...listingInput(),
        images: [
          'media/listings/other-user/listing-photo/11111111-1111-4111-8111-111111111111.jpg',
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('keeps existing photos when an update does not send images', async () => {
    const existing = property({
      ownerUserId: 'user-1',
      images: [
        'media/listings/user-1/listing-photo/11111111-1111-4111-8111-111111111111.jpg',
      ],
    });
    const service = createService({
      properties: {
        findOne: async () => existing,
        save: async (row: Property) => row,
      },
    });

    const updated = await service.updateListing(
      'user-1',
      'property-1',
      listingInput(),
    );

    expect(updated.imageKeys).toEqual(existing.images);
  });

  it('returns the caller listings with the date they were created', async () => {
    const owned = property({
      ownerUserId: 'user-1',
      slug: 'lekki-terrace',
      createdAt: new Date('2026-10-12T00:00:00.000Z'),
    });
    let query: unknown;
    const service = createService({
      properties: {
        find: async (options: unknown) => {
          query = options;
          return [owned];
        },
      },
    });

    const rows = await service.listMine('user-1');

    expect(query).toEqual({
      where: { ownerUserId: 'user-1' },
      order: { createdAt: 'DESC' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe('lekki-terrace');
    expect(rows[0]?.createdAt).toBe('2026-10-12T00:00:00.000Z');
    expect(rows[0]).not.toHaveProperty('submission');
  });

  it('deletes a listing the caller owns', async () => {
    const removeProperty = vi.fn(async () => ({ affected: 1 }));
    const removeSaved = vi.fn(async () => ({ affected: 0 }));
    const service = createService({
      properties: {
        findOne: async () =>
          property({ id: 'owned-1', ownerUserId: 'user-1', slug: 'mine' }),
        delete: removeProperty,
      },
      saved: { delete: removeSaved },
    });

    await service.deleteListing('user-1', 'mine');

    expect(removeSaved).toHaveBeenCalledWith({ propertyId: 'owned-1' });
    expect(removeProperty).toHaveBeenCalledWith({ id: 'owned-1' });
  });

  it('rejects a delete from someone who does not own the listing', async () => {
    const service = createService({
      properties: {
        findOne: async () => property({ ownerUserId: 'owner-1' }),
      },
    });

    await expect(
      service.deleteListing('other-user', 'property-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an update from someone who does not own the listing', async () => {
    const service = createService({
      properties: {
        findOne: async () => property({ ownerUserId: 'owner-1' }),
      },
    });

    await expect(
      service.updateListing('other-user', 'property-1', listingInput()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps seeded listings read-only', async () => {
    const service = createService({
      properties: {
        findOne: async () => property({ ownerUserId: null }),
      },
    });

    await expect(
      service.updateListing('user-1', 'property-1', listingInput()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function listingInput(): CreateListingDto {
  return {
    partnerType: 'developer',
    listingKind: 'development',
    purpose: 'sale',
    propertyType: 'House',
    propertySubtype: 'Terrace',
    title: 'Lekki Terrace',
    description: 'A four-bedroom terrace in a gated estate.',
    bedrooms: 4,
    bathrooms: 4,
    floorArea: 280,
    condition: 'Newly built',
    country: 'Nigeria',
    state: 'Lagos',
    cityArea: 'Lekki',
    streetAddress: '12 Admiralty Way',
    estateName: 'Palm Estate',
    askingPrice: 25_000_000,
    negotiable: true,
    currentAvailability: 'Available now',
    ownershipDocument: 'deed.pdf',
    submission: {
      verifyDetails: { fullName: 'Ada Lovelace', email: 'ada@example.com' },
      amenities: { amenities: 'Parking, Gated compound' },
      propertyDetails: { furnishingStatus: 'Furnished' },
    },
  };
}

function catalogBuilder(rows: Property[]) {
  const clauses: unknown[] = [];
  const builder = {
    clauses,
    where(sql: string) {
      clauses.push(sql);
      return builder;
    },
    andWhere(sql: string, params?: unknown) {
      clauses.push({ sql, params });
      return builder;
    },
    orderBy(column: string, direction: string) {
      clauses.push({ column, direction });
      return builder;
    },
    getMany: async () => rows,
  };
  return builder;
}

function createService(overrides: {
  properties?: Record<string, unknown>;
  saved?: Record<string, unknown>;
  users?: Record<string, unknown>;
  places?: { namesFor: (location?: string) => Promise<string[]> };
}) {
  const properties = {
    count: async () => 1,
    find: async () => [],
    findOne: async () => null,
    findBy: async () => [],
    save: async (row: Partial<Property>) => row,
    create: (row: Partial<Property>) => row,
    merge: (row: Property, patch: Partial<Property>) =>
      Object.assign(row, patch),
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

  const users = {
    find: async () => [],
    findOne: async () => null,
    ...overrides.users,
  };

  return new PropertiesService(
    properties as never,
    saved as never,
    users as never,
    {
      readableUrl: async (value: string) => value,
    } as never,
    (overrides.places ?? {
      namesFor: async (location?: string) => {
        const term = location?.trim();
        return term ? [term] : [];
      },
    }) as never,
  );
}
