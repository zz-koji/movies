import { Sanitizer } from '@app/utils/sanitizer/sanitizer';

export type GetLocalMoviesDto = {
  page?: number;
  limit?: number;
  query?: string;
  genre?: string;
  year?: number;
  rating?: number;
  available?: boolean | string;
  sortBy?: 'title' | 'year' | 'rating';
};


export class GetLocalMoviesQueryDto {
  pagination: {
    page: number;
    limit: number;
  };
  searchPattern: string | null;
  genreFilter: string | null;
  yearFilter: number | null;
  minRatingFilter: number | null;
  availabilityFilter: boolean | null;
  offset: number;
  sortBy: "title" | "year" | "rating";

  constructor(getLocalMovies: GetLocalMoviesDto) {
    const { page, limit } = Sanitizer.resolvePagination<GetLocalMoviesDto>({ page: getLocalMovies.page, limit: getLocalMovies.limit });
    this.pagination = { page, limit };
    this.offset = (page - 1) * limit;
    const searchTerm = Sanitizer.normalizeTextQueryParam(getLocalMovies.query);
    this.searchPattern = Sanitizer.buildSearchPattern(searchTerm);
    this.genreFilter = Sanitizer.normalizeTextQueryParam(getLocalMovies.genre);
    this.yearFilter = Sanitizer.parseNumericQueryParam(getLocalMovies.year);
    this.minRatingFilter = Sanitizer.parseFloatQueryParam(getLocalMovies.rating);
    this.availabilityFilter = Sanitizer.parseBooleanQueryParam(getLocalMovies.available);
    this.sortBy = getLocalMovies.sortBy || "title";
  }
}