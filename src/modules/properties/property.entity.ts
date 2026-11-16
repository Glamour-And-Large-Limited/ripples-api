import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ListingPurpose = 'rent' | 'sale';
export type PropertyKind = 'house' | 'apartment' | 'land' | 'commercial';
export type AvailabilityStatus =
  'available' | 'unavailable' | 'under-offer' | 'reserved' | 'sold' | 'rented';
export type VerificationStatus = 'verified' | 'pending' | 'unverified';
export type PaymentFrequency = 'year' | 'month';

@Entity({ name: 'properties' })
export class Property {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'text' })
  area: string;

  @Column({ type: 'text' })
  purpose: ListingPurpose;

  @Column({ type: 'text' })
  kind: PropertyKind;

  @Column({ type: 'text' })
  subtype: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ name: 'payment_frequency', type: 'text', nullable: true })
  paymentFrequency: PaymentFrequency | null;

  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'int', nullable: true })
  toilets: number | null;

  @Column({ name: 'floor_area', type: 'int' })
  floorArea: number;

  @Column({ name: 'land_area', type: 'int', nullable: true })
  landArea: number | null;

  @Column({ name: 'parking_spaces', type: 'int', nullable: true })
  parkingSpaces: number | null;

  @Column({ type: 'text' })
  condition: string;

  @Column({ type: 'text' })
  furnishing: string;

  @Column({ name: 'year_built', type: 'int', nullable: true })
  yearBuilt: number | null;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'text' })
  verification: VerificationStatus;

  @Column({ name: 'partner_verified', type: 'boolean', default: false })
  partnerVerified: boolean;

  @Column({ type: 'text' })
  availability: AvailabilityStatus;

  @Column({ name: 'posted_ago', type: 'text' })
  postedAgo: string;

  @Column({ name: 'confirmed_ago', type: 'text', nullable: true })
  confirmedAgo: string | null;

  @Column({ name: 'title_document', type: 'text', nullable: true })
  titleDocument: string | null;

  @Column({ name: 'document_verification', type: 'text', nullable: true })
  documentVerification: VerificationStatus | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'boolean', default: false })
  negotiable: boolean;

  @Column({ name: 'recommended_reason', type: 'text', nullable: true })
  recommendedReason: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
