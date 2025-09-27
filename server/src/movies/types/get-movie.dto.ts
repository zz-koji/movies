export type GetMovieDto = {
	id?: number;
	title?: string;
} & ({ id: number } | { title: string })
