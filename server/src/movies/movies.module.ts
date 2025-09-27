import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [HttpModule],
	providers: [MoviesService],
	controllers: [MoviesController]
})
export class MoviesModule { }
