import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs';
import { GetMoviesDto } from './types/get-movies.dto';
import { GetMovieDto } from './types/get-movie.dto';


@Injectable()
export class MoviesService {
	private apiKey: string;
	private apiUrl: string;
	constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
		this.apiKey = this.configService.getOrThrow('MOVIES_API_KEY')
		this.apiUrl = this.configService.getOrThrow('MOVIES_API_URL')
	}

	private buildQuery(args: { param: string, value: string | number | undefined }[]): string {
		let query: string = `?apiKey=${this.apiKey}`;

		for (const queryPair of args) {
			const param = queryPair['param']
			const value = queryPair['value']

			if (value) query = query + `&${param}=${value}`
		}

		return query
	}

	async getMovies({ title, page = 1 }: GetMoviesDto) {
		const query = this.buildQuery([{
			param: "s", value: title
		}, { param: "page", value: page }])
		return this.httpService.get(`${this.apiUrl}/${query}`).pipe(map(response => response.data)
		)
	}

	async getMovie({ id, title }: GetMovieDto) {
		const query = this.buildQuery([{ param: "i", value: id }, { param: "t", value: title }])
		return this.httpService.get(`${this.apiUrl}/${query}`).pipe(map(response => response.data))
	}
}
