import { Module } from '@nestjs/common';
import { ListingCatalogController } from './listing-catalog.controller.js';

@Module({
  controllers: [ListingCatalogController],
})
export class ListingCatalogModule {}
