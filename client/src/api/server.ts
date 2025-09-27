const VITE_PUBLIC_API_BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export type GetMoviesRequest = {
	title: string;
	page: number;
	id?: number;
};

export type GetMovieRequest = {
	id?: number;
	title?: string;
} & ({ id: number } | { title: string });

export async function getMovies(params: GetMoviesRequest) {
	const searchParams = new URLSearchParams({
		title: params.title,
		page: params.page.toString(),
	});

	if (params.id) {
		searchParams.append('id', params.id.toString());
	}

	const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movies?${searchParams}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch movies: ${response.statusText}`);
	}

	return response.json();
}

export async function getMovie(params: GetMovieRequest) {
	const searchParams = new URLSearchParams();

	if (params.id) {
		searchParams.append('id', params.id.toString());
	}

	if (params.title) {
		searchParams.append('title', params.title);
	}

	const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie?${searchParams}`);

	if (!response.ok) {
		throw new Error(`Failed to fetch movie: ${response.statusText}`);
	}

	return response.json();
}
