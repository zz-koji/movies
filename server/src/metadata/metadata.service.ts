import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Database } from 'src/database/types';
import { MovieMetadata, MovieMetadataInsert, OmdbMovie } from 'src/movies/types';

@Injectable()
export class MetadataService {
  constructor(
    @Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>
  ) { }

  private static parseYear(value?: string | null): number | null {
    if (!value) {
      return null
    }

    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  private static parseImdbRating(value?: string | null): number | null {
    if (!value) {
      return null
    }

    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  private static parseRuntimeMinutes(value?: string | null): number | null {
    if (!value) {
      return null
    }

    const match = value.match(/(\d+)/)
    if (!match) {
      return null
    }

    const minutes = Number.parseInt(match[1] ?? '', 10)
    return Number.isNaN(minutes) ? null : minutes
  }

  private static buildMetadataRecord(movie: OmdbMovie): MovieMetadataInsert {
    return {
      omdb_id: movie.imdbID,
      title: movie.Title,
      year: MetadataService.parseYear(movie.Year),
      genre: movie.Genre || null,
      director: movie.Director || null,
      actors: movie.Actors || null,
      imdb_rating: MetadataService.parseImdbRating(movie.imdbRating),
      runtime: MetadataService.parseRuntimeMinutes(movie.Runtime),
      data: movie,
    }
  }

  async getMovieMetadataRow(omdbId: string): Promise<MovieMetadata | undefined> {
    return await this.db
      .selectFrom('movie_metadata')
      .selectAll()
      .where('omdb_id', '=', omdbId)
      .executeTakeFirst()
  }

  async getMoviesMetadataRows(title: string) {
    return await this.db.selectFrom('movie_metadata').selectAll().where('title', 'ilike', `${title}`).execute()
  }

  async upsertMovieMetadata(movie: OmdbMovie) {
    const record = MetadataService.buildMetadataRecord(movie)

    await this.db
      .insertInto('movie_metadata')
      .values(record)
      .onConflict((oc) =>
        oc.column('omdb_id').doUpdateSet({
          title: record.title,
          year: record.year,
          genre: record.genre,
          director: record.director,
          actors: record.actors,
          imdb_rating: record.imdb_rating,
          runtime: record.runtime,
          data: record.data,
          updated_at: sql`now()`,
        }),
      )
      .execute()
  }
}
