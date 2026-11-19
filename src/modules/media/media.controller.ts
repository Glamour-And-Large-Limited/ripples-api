import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { UserResponse } from '../users/users.service.js';
import { CreateUploadDto } from './create-upload.dto.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @ApiBearerAuth('access-token')
  @Post('uploads')
  @HttpCode(HttpStatus.CREATED)
  async createUpload(
    @CurrentUser() user: UserResponse,
    @Body() input: CreateUploadDto,
  ) {
    const data = await this.media.createUpload(user.id, input);
    return { message: 'Upload URL created', data };
  }
}
