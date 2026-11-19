import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserResponse } from '../users/users.service.js';
import { Public } from '../../utils/decorators/public.decorator.js';
import { CreateListingDto } from './create-listing.dto.js';
import { PropertiesService } from './properties.service.js';
import { SavePropertyDto } from './save-property.dto.js';

@Controller()
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Public()
  @Get('properties')
  async findAll() {
    const data = await this.properties.findAll();
    return { message: 'Properties fetched successfully', data };
  }

  @Public()
  @Get('properties/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const data = await this.properties.findBySlug(slug);
    return { message: 'Property fetched successfully', data };
  }

  @ApiBearerAuth('access-token')
  @Post('properties')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: UserResponse,
    @Body() input: CreateListingDto,
  ) {
    const data = await this.properties.createListing(user.id, input);
    return { message: 'Listing submitted successfully', data };
  }

  @ApiBearerAuth('access-token')
  @Patch('properties/:slug')
  async update(
    @CurrentUser() user: UserResponse,
    @Param('slug') slug: string,
    @Body() input: CreateListingDto,
  ) {
    const data = await this.properties.updateListing(user.id, slug, input);
    return { message: 'Listing updated successfully', data };
  }

  @ApiBearerAuth('access-token')
  @Get('me/saved-properties')
  async listSaved(@CurrentUser() user: UserResponse) {
    const data = await this.properties.listSaved(user.id);
    return { message: 'Saved properties fetched successfully', data };
  }

  @ApiBearerAuth('access-token')
  @Post('me/saved-properties')
  @HttpCode(HttpStatus.OK)
  async save(
    @CurrentUser() user: UserResponse,
    @Body() input: SavePropertyDto,
  ) {
    const data = await this.properties.save(user.id, input.propertyId);
    return { message: 'Property saved successfully', data };
  }

  @ApiBearerAuth('access-token')
  @Delete('me/saved-properties/:propertyId')
  async unsave(
    @CurrentUser() user: UserResponse,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    await this.properties.unsave(user.id, propertyId);
    return {
      message: 'Property removed from saved properties',
      data: { propertyId },
    };
  }
}
