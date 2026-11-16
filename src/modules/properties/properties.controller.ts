import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserResponse } from '../users/users.service.js';
import { Public } from '../../utils/decorators/public.decorator.js';
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
