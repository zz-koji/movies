import { Module } from '@nestjs/common';
import { MovieRequestsService } from './movie-requests.service';
import { DatabaseModule } from 'src/database/database.module';
import { MovieRequestsController } from './movie-requests.controller';

@Module({
	imports: [DatabaseModule],
	providers: [MovieRequestsService],
	controllers: [MovieRequestsController]
})
export class MovieRequestsModule { }
