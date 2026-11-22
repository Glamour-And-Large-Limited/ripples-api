import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../utils/is-unique-violation.js';
import { normalizePhone } from '../../utils/normalize-phone.js';
import type { CreateUserDto } from './create-user.dto.js';
import type { UpdateUserDto } from './update-user.dto.js';
import { User } from './user.entity.js';

export type NotificationPreferences = {
  inquiries: boolean;
  inspections: boolean;
  saved: boolean;
};

export type UserResponse = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  location: string | null;
  notificationPreferences: NotificationPreferences;
  hasPassword: boolean;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  email: string;
  name: string;
  passwordHash: string;
  phone?: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(input: CreateUserDto): Promise<UserResponse> {
    return this.saveUser({
      email: input.email,
      name: input.name,
      phone: null,
      passwordHash: null,
    });
  }

  async createAccount(input: CreateAccountInput): Promise<UserResponse> {
    return this.saveUser({
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      passwordHash: input.passwordHash,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.trim().toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.users.findOneBy({ phone });
  }

  async findOrCreateByGoogle(input: {
    sub: string;
    email: string;
    name: string | null;
  }): Promise<UserResponse> {
    const email = input.email.trim().toLowerCase();
    const linked = await this.users.findOneBy({ googleSub: input.sub });
    if (linked) {
      return toUserResponse(linked);
    }

    const existing = await this.users.findOneBy({ email });
    if (existing) {
      if (existing.googleSub && existing.googleSub !== input.sub) {
        throw new ConflictException(
          'This email is already linked to another Google account',
        );
      }
      existing.googleSub = input.sub;
      if (needsSystemUsername(existing.name) && input.name?.trim()) {
        existing.name = input.name.trim();
      }
      try {
        return toUserResponse(await this.users.save(existing));
      } catch (error) {
        throw mapWriteError(error);
      }
    }

    const name = input.name?.trim() || createGenericUsername(email);
    return this.saveUser({
      email,
      phone: null,
      name,
      passwordHash: null,
      googleSub: input.sub,
    });
  }

  async findOrCreateByPhone(phone: string): Promise<UserResponse> {
    const existing = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone })
      .getOne();
    if (existing) {
      return toUserResponse(await this.ensureSystemUsername(existing, phone));
    }

    return this.saveUser({
      email: null,
      phone,
      name: createGenericUsername(phone),
      passwordHash: null,
    });
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.users.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return users.map((user) => toUserResponse(user));
  }

  async findOne(id: string): Promise<UserResponse> {
    return toUserResponse(await this.findUserWithPassword(id));
  }

  async findAuthAccount(id: string): Promise<User> {
    return this.findUserWithPassword(id);
  }

  async setPasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserResponse> {
    const user = await this.findUserWithPassword(id);
    user.passwordHash = passwordHash;
    user.sessionVersion += 1;
    return toUserResponse(await this.users.save(user));
  }

  async bumpSessionVersion(id: string): Promise<UserResponse> {
    const user = await this.findUser(id);
    user.sessionVersion += 1;
    return toUserResponse(await this.users.save(user));
  }

  async update(id: string, input: UpdateUserDto): Promise<UserResponse> {
    const user = await this.findUser(id);
    if (input.name !== undefined) {
      user.name = input.name;
    }
    if (input.location !== undefined) {
      user.location = input.location.trim() || null;
    }
    if (input.notificationPreferences) {
      const preferences = input.notificationPreferences;
      if (preferences.inquiries !== undefined) {
        user.notifyInquiries = preferences.inquiries;
      }
      if (preferences.inspections !== undefined) {
        user.notifyInspections = preferences.inspections;
      }
      if (preferences.saved !== undefined) {
        user.notifySavedProperties = preferences.saved;
      }
    }
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      const current = user.email?.trim().toLowerCase() ?? '';
      if (email !== current) {
        if (current) {
          throw new BadRequestException(
            'Email cannot be changed once it has been added',
          );
        }
        user.email = email || null;
      }
    }
    if (input.phone !== undefined) {
      const phone = input.phone.trim();
      if (!phone) {
        if (user.phone) {
          throw new BadRequestException(
            'Phone number cannot be changed once it has been added',
          );
        }
      } else {
        const normalized = normalizePhone(phone);
        if (!normalized) {
          throw new BadRequestException('Enter a valid phone number');
        }
        if (user.phone && user.phone !== normalized) {
          throw new BadRequestException(
            'Phone number cannot be changed once it has been added',
          );
        }
        user.phone = normalized;
      }
    }
    assertHasContact(user);

    try {
      await this.users.save(user);
      return this.findOne(id);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async updateContact(
    id: string,
    input: { email?: string; phone?: string },
  ): Promise<UserResponse> {
    const user = await this.findUser(id);
    if (input.email !== undefined) {
      user.email = input.email;
    }
    if (input.phone !== undefined) {
      user.phone = input.phone;
    }
    assertHasContact(user);

    try {
      await this.users.save(user);
      return this.findOne(id);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.users.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
  }

  private async saveUser(input: {
    email: string | null;
    phone?: string | null;
    name: string;
    passwordHash: string | null;
    googleSub?: string | null;
  }): Promise<UserResponse> {
    assertHasContact(input);

    try {
      const user = await this.users.save(
        this.users.create({
          email: input.email,
          phone: input.phone ?? null,
          name: input.name,
          passwordHash: input.passwordHash,
          googleSub: input.googleSub ?? null,
        }),
      );
      return toUserResponse(user);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.ensureSystemUsername(user, user.phone);
  }

  private async findUserWithPassword(id: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.ensureSystemUsername(user, user.phone);
  }

  private async ensureSystemUsername(
    user: User,
    phone: string | null,
  ): Promise<User> {
    if (!needsSystemUsername(user.name)) {
      return user;
    }

    user.name = createGenericUsername(phone ?? user.id);
    return this.users.save(user);
  }
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    location: user.location ?? null,
    notificationPreferences: {
      inquiries: user.notifyInquiries ?? false,
      inspections: user.notifyInspections ?? false,
      saved: user.notifySavedProperties ?? false,
    },
    hasPassword: Boolean(user.passwordHash),
    sessionVersion: user.sessionVersion ?? 0,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const LEGACY_PLACEHOLDER_NAMES = new Set(['ripples user', 'rippler user']);

function needsSystemUsername(name: string | null | undefined): boolean {
  const normalized = name?.trim().toLowerCase() ?? '';
  return !normalized || LEGACY_PLACEHOLDER_NAMES.has(normalized);
}

export function createGenericUsername(seed: string): string {
  const lastDigits = seed.replace(/\D/g, '').slice(-4) || '0000';
  const suffix = randomBytes(2).toString('hex');
  return `ripple_${lastDigits}${suffix}`;
}

function assertHasContact(input: {
  email?: string | null;
  phone?: string | null;
}): void {
  if (!input.email && !input.phone) {
    throw new BadRequestException('A user requires an email or phone number');
  }
}

function mapWriteError(error: unknown): unknown {
  if (isUniqueViolation(error)) {
    const detail =
      error instanceof Error &&
      'driverError' in error &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'detail' in error.driverError &&
      typeof error.driverError.detail === 'string'
        ? error.driverError.detail
        : '';
    if (detail.includes('(phone)')) {
      return new ConflictException(
        'A user with this phone number already exists',
      );
    }
    if (detail.includes('(google_sub)')) {
      return new ConflictException(
        'This Google account is already linked to a user',
      );
    }
    return new ConflictException('A user with this email already exists');
  }
  return error;
}
