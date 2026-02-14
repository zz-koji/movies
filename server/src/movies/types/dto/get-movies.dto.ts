import { Sanitizer } from '@app/utils/sanitizer/sanitizer';
import { BadRequestException } from '@nestjs/common';

export type GetMovies = {
  title: string;
  page: number;
  id?: number;
  sortBy?: 'rating' | 'title' | 'year';
};

export class GetMoviesDto {
  title: string | null;
  page: number;
  id: number | null;
  sortBy: 'rating' | 'title' | 'year';

  constructor(partial: Partial<GetMovies>) {
    this.title = this.resolveTitle(partial.title);
    this.page = this.resolvePage(partial.page);
    this.id = this.resolveId(partial.id);
    this.sortBy = this.resolveSortBy(partial.sortBy);
  }

  private resolveTitle(value?: string): string | null {
    const title = Sanitizer.normalizeTextQueryParam(value);
    return title;
  }

  private resolveSortBy(value?: string): 'rating' | 'title' | 'year' {
    const sortBy = Sanitizer.normalizeTextQueryParam(value);
    if (sortBy === null) {
      return 'rating';
    }

    if (sortBy !== 'rating' && sortBy !== 'title' && sortBy !== 'year') {
      throw new BadRequestException('sortBy param must be a valid value.');
    }

    return sortBy;
  }

  private resolvePage(value?: number): number {
    const page = Sanitizer.parseNumericQueryParam(value);
    if (page === null || page < 1) {
      return 1;
    }
    return page;
  }

  private resolveId(value?: number): number | null {
    const id = Sanitizer.parseNumericQueryParam(value);
    return id;
  }
}
