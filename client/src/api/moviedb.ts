export interface MovieSearchResult {
  id: string;
  title: string;
  year: number;
  poster?: string;
  overview: string;
  vote_average: number;
}

export interface MovieDetails extends MovieSearchResult {
  runtime: number;
  genres: Array<{ id: number; name: string }>;
  director?: string;
  cast: Array<{ name: string; character: string }>;
}

const MOCK_SEARCH_RESULTS: MovieSearchResult[] = [];

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!query.trim()) {
    return [];
  }

  return MOCK_SEARCH_RESULTS.filter(movie =>
    movie.title.toLowerCase().includes(query.toLowerCase())
  );
}

export async function getMovieDetails(movieId: string): Promise<MovieDetails | null> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const searchResult = MOCK_SEARCH_RESULTS.find(m => m.id === movieId);
  if (!searchResult) {
    return null;
  }

  return {
    ...searchResult,
    runtime: 139,
    genres: [{ id: 1, name: 'Thriller' }, { id: 2, name: 'Drama' }],
    director: 'David Fincher',
    cast: [
      { name: 'Brad Pitt', character: 'Tyler Durden' },
      { name: 'Edward Norton', character: 'The Narrator' }
    ]
  };
}