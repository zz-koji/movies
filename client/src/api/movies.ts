import type { Movie } from '../types';

export const LOCAL_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'The Matrix',
    description: 'A computer programmer discovers that reality as he knows it might not be real after all.',
    year: 1999,
    genre: ['Action', 'Sci-Fi'],
    rating: 8.7,
    duration: 136,
    director: 'Lana Wachowski, Lilly Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    available: true,
    poster: 'https://images.unsplash.com/photo-1581905764498-7e3cf82262cc?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '2',
    title: 'Inception',
    description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task.',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 8.8,
    duration: 148,
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
    available: true,
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '3',
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.',
    year: 2024,
    genre: ['Action', 'Adventure', 'Drama'],
    rating: 8.9,
    duration: 166,
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    available: false,
    poster: 'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?auto=format&fit=crop&w=600&q=80'
  }
];

export async function getMovieLibrary(): Promise<Movie[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return LOCAL_MOVIES;
}

export async function addMovieToLibrary(movie: Movie): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  LOCAL_MOVIES.push(movie);
}

export async function updateMovieAvailability(movieId: string, available: boolean): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const movie = LOCAL_MOVIES.find(m => m.id === movieId);
  if (movie) {
    movie.available = available;
  }
}