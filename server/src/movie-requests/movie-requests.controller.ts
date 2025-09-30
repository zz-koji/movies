import { Controller, Get, ParseArrayPipe, Query } from '@nestjs/common';
import { MovieRequestsService } from './movie-requests.service';

@Controller('movie-requests')
export class MovieRequestsController {
	constructor(private readonly movieRequestsService: MovieRequestsService) { }

	@Get()
	async getRequests(@Query('imdbIds', new ParseArrayPipe({ optional: true })) imdbIds: string[]) {

		return await this.movieRequestsService.get({ imdbIds: imdbIds })
	}
}
