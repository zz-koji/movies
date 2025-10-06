import { Module } from '@nestjs/common';
import { OmdbApiService } from './omdb-api.service';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [OmdbApiService],
  exports: [OmdbApiService]
})
export class OmdbApiModule { }
