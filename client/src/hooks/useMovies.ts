import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { getMovies, getMovie, type GetMoviesRequest, type GetMovieRequest } from '../api/server';
import type { Movie, SearchFilters } from '../types';
import { getMovieLibrary } from '../api/movies';

function transformOMDBTMovies(omdbMovies: any[]) {
	return omdbMovies.map((serverMovie: any) => ({
		id: serverMovie.imdbID,
		title: serverMovie.Title,
		description: serverMovie.Plot || 'No description available',
		year: parseInt(serverMovie.Year) || 0,
		genre: serverMovie.Genre ? serverMovie.Genre.split(', ') : [],
		rating: parseFloat(serverMovie.imdbRating) || 0,
		duration: 0, // Not available from server
		director: serverMovie.Director || 'Unknown',
		cast: serverMovie.Actors ? serverMovie.Actors.split(', ') : [],
		available: false, // Server movies are not in local library
		poster: serverMovie.Poster !== 'N/A' ? serverMovie.Poster : undefined
	}));
}

export function useMovies(params: GetMoviesRequest, enabled: boolean = true) {
	return useQuery({
		queryKey: ['movies', params],
		queryFn: () => getMovies(params),
		enabled: enabled && !!params.title && params.title.length >= 2,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useMovie(params: GetMovieRequest, enabled: boolean = true) {
	return useQuery({
		queryKey: ['movie', params],
		queryFn: () => getMovie(params),
		enabled: enabled && (!!params.id || !!params.title),
		staleTime: 10 * 60 * 1000, // 10 minutes
	});
}

interface UseMovieLibraryParams {
	filters: SearchFilters;
	debouncedQuery: string;
	sortBy: 'featured' | 'rating' | 'year';
	serverMoviesData?: { Search?: any[] };
}

export function useMovieLibrary({
	filters,
	debouncedQuery,
	sortBy,
}: UseMovieLibraryParams): { movies: Movie[], isLoading: boolean, error: boolean } {
	const [movies, setMovies] = useState<Movie[]>([])
	const isQuery = debouncedQuery !== "" && debouncedQuery.length >= 2 ? true : false
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [error, setError] = useState<Error | null>(null)
	const [isError, setIsError] = useState<boolean>(false)

	useEffect(() => {
		const loadData = async () => {
			const [library] = await Promise.all([
				getMovieLibrary(),
			]);
			setMovies(library);
		};

		void loadData();
	}, []);

	const {
		data: omdbMovies,
		isLoading: isSearching,
		error: searchError
	} = useMovies(
		{ title: debouncedQuery, page: 1 },
		isQuery
	);

	useEffect(() => {
		const transformedOMDBMovies = transformOMDBTMovies(omdbMovies)
		const sortedTransformedOmdbMovies = sortMovies(transformedOMDBMovies)
		setMovies(sortedTransformedOmdbMovies)
	}, [omdbMovies])


	useEffect(() => {
		const isError = searchError ? true : false
		setIsLoading(isError)
	}, [searchError])

	useEffect(() => {
		const isLoading = isSearching
		setIsLoading(isLoading)
	}, [isSearching])

	const sortMovies = (movies: Movie[]) => {
		switch (sortBy) {
			case 'rating':
				movies.sort((a, b) => b.rating - a.rating);
				break;
			case 'year':
				movies.sort((a, b) => b.year - a.year);
				break;
			default:
				movies.sort((a, b) => {
					if (a.available === b.available) {
						return b.rating - a.rating;
					}
					return a.available ? -1 : 1;
				});
		}
		return movies;
	}


	return {
		movies,
		isLoading,
		isError,
		error
	};
}
