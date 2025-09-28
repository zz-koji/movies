import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto, GetMovieDto } from './types'

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
