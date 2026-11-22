import { Module } from '@nestjs/common';
import { AmenitiesModule } from './modules/amenities/amenities.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EngagementsModule } from './modules/engagements/engagements.module.js';
import { HealthModule } from './health/health.module.js';
import { ListingCatalogModule } from './modules/listing-catalog/listing-catalog.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { PropertiesModule } from './modules/properties/properties.module.js';
import { RegionsModule } from './modules/regions/regions.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    MessagingModule,
    IntegrationsModule,
    HealthModule,
    NotesModule,
    UsersModule,
    AuthModule,
    EngagementsModule,
    MediaModule,
    RegionsModule,
    ListingCatalogModule,
    AmenitiesModule,
    PropertiesModule,
  ],
})
export class AppModule {}
