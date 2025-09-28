import { Module } from '@nestjs/common';
import { MoviesModule } from './movies/movies.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MovieRequestsModule } from './movie-requests/movie-requests.module';

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true }), MoviesModule, DatabaseModule, MovieRequestsModule],
})
export class AppModule { }
