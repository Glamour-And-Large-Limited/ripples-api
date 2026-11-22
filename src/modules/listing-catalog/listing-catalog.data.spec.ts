import { listingCatalog } from './listing-catalog.data.js';

describe('listingCatalog', () => {
  it('covers every listing wizard choice list', () => {
    expect(listingCatalog.listingKinds.map((kind) => kind.id)).toEqual([
      'individual',
      'unit',
      'development',
    ]);
    expect(listingCatalog.purposes.map((purpose) => purpose.id)).toEqual([
      'sale',
      'rent',
    ]);
    expect(listingCatalog.propertyTypes.map((type) => type.value)).toEqual([
      'House',
      'Apartment',
      'Land',
      'Commercial',
    ]);
    expect(listingCatalog.ownershipRelationships.length).toBeGreaterThan(0);
    expect(listingCatalog.currentAvailability.length).toBeGreaterThan(0);
    expect(listingCatalog.propertyRules.length).toBeGreaterThan(0);
  });
});
