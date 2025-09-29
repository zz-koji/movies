import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'node_modules/kysely/dist/esm';
import { Database } from 'src/database/types';
import { createMovieRequestSchema, CreateMovieRequestSchema } from './types';

@Injectable()
export class MovieRequestsService {
	constructor(
		@Inject('MOVIES_DATABASE')
		private readonly db: Kysely<Database>
	) { }


	async get({ imdbIds }: { imdbIds: string[] }) {

		return await this.db.selectFrom('movie_requests').where('imdb_id', 'in', imdbIds).selectAll().execute()
	}

	async create(data: CreateMovieRequestSchema, createdBy: string) {
		const parsedValues = createMovieRequestSchema.parse({ ...data, requested_by: createdBy })

		return await this.db.insertInto('movie_requests').values(parsedValues).returningAll().executeTakeFirst()
	}

	async update() { }

	async delete() { }

	async complete() { }
}
