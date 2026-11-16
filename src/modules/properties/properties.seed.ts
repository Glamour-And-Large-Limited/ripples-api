import type {
  AvailabilityStatus,
  ListingPurpose,
  PaymentFrequency,
  PropertyKind,
  VerificationStatus,
} from './property.entity.js';

export type PropertySeed = {
  id: string;
  slug: string;
  title: string;
  location: string;
  area: string;
  purpose: ListingPurpose;
  kind: PropertyKind;
  subtype: string;
  price: number;
  paymentFrequency?: PaymentFrequency;
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
  verification: VerificationStatus;
  partnerVerified: boolean;
  availability: AvailabilityStatus;
  postedAgo: string;
  confirmedAgo?: string;
  titleDocument?: string;
  documentVerification?: VerificationStatus;
  description: string;
  negotiable: boolean;
  recommendedReason?: string;
  sortOrder: number;
};

function image(number: number) {
  return `/images/design-system/home-property-${String(number).padStart(2, '0')}.png`;
}

function gallery(start: number) {
  return [0, 1, 2, 3].map((offset) => image(((start + offset) % 8) + 1));
}

export const PROPERTY_SEEDS: PropertySeed[] = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    slug: 'property-1',
    title: 'Modern 3-Bedroom Terrace Home',
    location: 'Lekki Phase 1, Lagos',
    area: 'Lekki Phase 1',
    purpose: 'rent',
    kind: 'house',
    subtype: 'Terrace',
    price: 4_200_000,
    paymentFrequency: 'year',
    bedrooms: 3,
    bathrooms: 3,
    toilets: 4,
    floorArea: 250,
    parkingSpaces: 2,
    condition: 'Newly built',
    furnishing: 'Semi-furnished',
    yearBuilt: 2024,
    images: gallery(0),
    verification: 'verified',
    partnerVerified: true,
    availability: 'available',
    postedAgo: '5 days ago',
    confirmedAgo: '2 days ago',
    description:
      'A modern terrace home in a secure Lekki estate, with generous living spaces, en-suite bedrooms, a fitted kitchen, and convenient access to shops and major roads.',
    negotiable: false,
    recommendedReason: "Similar to properties you've saved.",
    sortOrder: 1,
  },
  {
    id: '11111111-1111-4111-8111-000000000002',
    slug: 'property-2',
    title: 'Newly Built 3-Bedroom Terrace Duplex',
    location: 'Ikoyi Gardens, Lagos',
    area: 'Ikoyi',
    purpose: 'sale',
    kind: 'house',
    subtype: 'Terrace duplex',
    price: 90_000_000,
    bedrooms: 3,
    bathrooms: 4,
    toilets: 5,
    floorArea: 300,
    landArea: 360,
    parkingSpaces: 3,
    condition: 'Newly built',
    furnishing: 'Unfurnished',
    yearBuilt: 2025,
    images: gallery(1),
    verification: 'verified',
    partnerVerified: true,
    availability: 'available',
    postedAgo: '2 days ago',
    confirmedAgo: '2 days ago',
    titleDocument: "Governor's Consent",
    documentVerification: 'verified',
    description:
      'A newly built terrace duplex with modern finishes, bright living areas, en-suite bedrooms, a fitted kitchen, and private parking in a managed Ikoyi estate.',
    negotiable: true,
    recommendedReason: 'Matches your preferred locations and budget.',
    sortOrder: 2,
  },
  {
    id: '11111111-1111-4111-8111-000000000003',
    slug: 'property-3',
    title: 'Waterfront 2-Bedroom Apartment',
    location: 'Banana Island, Lagos',
    area: 'Banana Island',
    purpose: 'rent',
    kind: 'apartment',
    subtype: 'Flat',
    price: 12_000_000,
    paymentFrequency: 'year',
    bedrooms: 2,
    bathrooms: 2,
    toilets: 3,
    floorArea: 180,
    parkingSpaces: 2,
    condition: 'Excellent',
    furnishing: 'Furnished',
    yearBuilt: 2022,
    images: gallery(2),
    verification: 'verified',
    partnerVerified: true,
    availability: 'under-offer',
    postedAgo: '1 week ago',
    confirmedAgo: 'today',
    description:
      'A furnished waterfront apartment with calm lagoon views, premium building services, and secure resident parking.',
    negotiable: false,
    sortOrder: 3,
  },
  {
    id: '11111111-1111-4111-8111-000000000004',
    slug: 'property-4',
    title: 'Serviced Penthouse with City Views',
    location: 'Victoria Island, Lagos',
    area: 'Victoria Island',
    purpose: 'sale',
    kind: 'apartment',
    subtype: 'Penthouse',
    price: 220_000_000,
    bedrooms: 4,
    bathrooms: 5,
    toilets: 6,
    floorArea: 420,
    parkingSpaces: 4,
    condition: 'Newly built',
    furnishing: 'Part-furnished',
    yearBuilt: 2025,
    images: gallery(3),
    verification: 'pending',
    partnerVerified: true,
    availability: 'available',
    postedAgo: '3 days ago',
    titleDocument: 'Certificate of Occupancy',
    documentVerification: 'pending',
    description:
      'An expansive serviced penthouse with panoramic city views, private lift access, and generous entertaining spaces.',
    negotiable: true,
    sortOrder: 4,
  },
  {
    id: '11111111-1111-4111-8111-000000000005',
    slug: 'property-5',
    title: 'Residential Land in a Gated Estate',
    location: 'Sangotedo, Lagos',
    area: 'Sangotedo',
    purpose: 'sale',
    kind: 'land',
    subtype: 'Residential land',
    price: 38_000_000,
    floorArea: 600,
    landArea: 600,
    condition: 'Dry land',
    furnishing: 'Not applicable',
    images: gallery(4),
    verification: 'verified',
    partnerVerified: true,
    availability: 'available',
    postedAgo: '6 days ago',
    confirmedAgo: '1 day ago',
    titleDocument: 'Deed of Assignment',
    documentVerification: 'verified',
    description:
      'A dry, accessible residential plot in a planned gated estate with drainage, paved roads, and documented ownership.',
    negotiable: true,
    sortOrder: 5,
  },
  {
    id: '11111111-1111-4111-8111-000000000006',
    slug: 'property-6',
    title: 'Grade A Office Suite',
    location: 'Eko Atlantic, Lagos',
    area: 'Eko Atlantic',
    purpose: 'rent',
    kind: 'commercial',
    subtype: 'Office',
    price: 28_000_000,
    paymentFrequency: 'year',
    bathrooms: 2,
    floorArea: 320,
    parkingSpaces: 6,
    condition: 'Excellent',
    furnishing: 'Fitted',
    yearBuilt: 2023,
    images: gallery(5),
    verification: 'verified',
    partnerVerified: true,
    availability: 'available',
    postedAgo: '4 days ago',
    confirmedAgo: '4 hours ago',
    description:
      'A fitted Grade A office suite with flexible work areas, meeting rooms, backup power, and managed reception services.',
    negotiable: false,
    sortOrder: 6,
  },
  {
    id: '11111111-1111-4111-8111-000000000007',
    slug: 'property-7',
    title: 'Family 4-Bedroom Semi-Detached Home',
    location: 'Chevron, Lagos',
    area: 'Chevron',
    purpose: 'rent',
    kind: 'house',
    subtype: 'Semi-detached house',
    price: 7_500_000,
    paymentFrequency: 'year',
    bedrooms: 4,
    bathrooms: 4,
    toilets: 5,
    floorArea: 310,
    parkingSpaces: 3,
    condition: 'Renovated',
    furnishing: 'Unfurnished',
    yearBuilt: 2020,
    images: gallery(6),
    verification: 'unverified',
    partnerVerified: false,
    availability: 'unavailable',
    postedAgo: '2 weeks ago',
    description:
      'A renovated family home with a private compound and spacious rooms near Chevron Drive.',
    negotiable: true,
    sortOrder: 7,
  },
  {
    id: '11111111-1111-4111-8111-000000000008',
    slug: 'property-8',
    title: 'High-Street Retail Space',
    location: 'Yaba, Lagos',
    area: 'Yaba',
    purpose: 'rent',
    kind: 'commercial',
    subtype: 'Retail space',
    price: 9_000_000,
    paymentFrequency: 'year',
    bathrooms: 1,
    floorArea: 210,
    parkingSpaces: 4,
    condition: 'Good',
    furnishing: 'Shell',
    yearBuilt: 2019,
    images: gallery(7),
    verification: 'verified',
    partnerVerified: true,
    availability: 'reserved',
    postedAgo: '9 days ago',
    confirmedAgo: '3 days ago',
    description:
      'A visible street-facing retail unit with strong pedestrian traffic, service access, and dedicated parking.',
    negotiable: true,
    sortOrder: 8,
  },
];
