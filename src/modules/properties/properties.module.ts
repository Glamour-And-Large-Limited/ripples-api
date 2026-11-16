import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { Property } from './property.entity.js';
import { SavedProperty } from './saved-property.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Property, SavedProperty])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
