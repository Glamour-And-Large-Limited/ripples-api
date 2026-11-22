import { Controller, Get } from '@nestjs/common';
import { Public } from '../../utils/decorators/public.decorator.js';
import { listingCatalog } from './listing-catalog.data.js';

@Public()
@Controller('listing-catalog')
export class ListingCatalogController {
  @Get()
  getCatalog() {
    return {
      message: 'Listing catalog fetched successfully',
      data: listingCatalog,
    };
  }
}
