import { Module } from '@nestjs/common';
import { MovieRequestsService } from './movie-requests.service';

@Module({
  providers: [MovieRequestsService]
})
export class MovieRequestsModule {}
