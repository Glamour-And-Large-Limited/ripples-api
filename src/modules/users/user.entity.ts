import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

const trim: ValueTransformer = {
  to: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
  from: (value: unknown) => value,
};

const email: ValueTransformer = {
  to: (value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  from: (value: unknown) => value,
};

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text', unique: true, nullable: true, transformer: email })
  email: string | null;

  @Column({ type: 'text', unique: true, nullable: true, transformer: trim })
  phone: string | null;

  @Column({
    name: 'google_sub',
    type: 'text',
    unique: true,
    nullable: true,
  })
  googleSub: string | null;

  @Column({ type: 'text', transformer: trim })
  name: string;

  @Column({ type: 'text', nullable: true, transformer: trim })
  location: string | null;

  @Column({ name: 'notify_inquiries', type: 'boolean', default: false })
  notifyInquiries: boolean;

  @Column({ name: 'notify_inspections', type: 'boolean', default: false })
  notifyInspections: boolean;

  @Column({ name: 'notify_saved_properties', type: 'boolean', default: false })
  notifySavedProperties: boolean;

  @Column({
    name: 'password_hash',
    type: 'text',
    nullable: true,
    select: false,
  })
  passwordHash: string | null;

  @Column({ name: 'session_version', type: 'int', default: 0 })
  sessionVersion: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
