export type Movie = {
  id: string;
  title: string;
  description: string;
  year: number;
  genre: string[];
  rating: number;
  poster?: string;
  duration: number;
  director: string;
  cast: string[];
  available: boolean;
}

export type MovieRequest = {
  title: string;
  year?: number;
  description?: string;
  requestedBy: string;
  priority: 'low' | 'medium' | 'high';
}

export type SearchFilters = {
  query: string;
  genre?: string;
  year?: number;
  rating?: number;
  available?: boolean;
}