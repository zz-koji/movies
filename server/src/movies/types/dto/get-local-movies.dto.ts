export type GetLocalMoviesDto = {
  page?: number | string;
  limit?: number | string;
  query?: string;
  genre?: string;
  year?: number | string;
  rating?: number | string;
  available?: boolean | string;
  sortBy?: 'title' | 'year' | 'rating'
};
