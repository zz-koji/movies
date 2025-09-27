import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto } from './types/get-movies.dto';
import type { GetMovieDto } from './types/get-movie.dto';

@Controller()
export class MoviesController {
	constructor(private readonly moviesService: MoviesService) { }

	@Get('movies')
	async getMovies(@Query() query: GetMoviesDto) {
		return await this.moviesService.getMovies(query)
	}

	@Get('movie')
	async getMovie(@Query() param: GetMovieDto) {
		return await this.moviesService.getMovie(param)
	}
}
