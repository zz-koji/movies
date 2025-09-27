import { useState, useMemo } from 'react';
import {
	Container,
	Title,
	TextInput,
	Select,
	Group,
	Button,
	Grid,
	Stack,
	Text,
	NumberInput,
	Switch,
	Paper
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Movie, SearchFilters } from '../types';
import { MovieCard } from './MovieCard';
import { MovieRequestForm } from './MovieRequestForm';

const SAMPLE_MOVIES: Movie[] = [
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
		available: true
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
		available: true
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
		available: false
	}
];

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];

export function MovieDashboard() {
	const [movies] = useState<Movie[]>(SAMPLE_MOVIES);
	const [filters, setFilters] = useState<SearchFilters>({
		query: '',
		genre: undefined,
		year: undefined,
		rating: undefined,
		available: undefined
	});
	const [requestModalOpened, { open: openRequestModal, close: closeRequestModal }] = useDisclosure(false);

	const filteredMovies = useMemo(() => {
		return movies.filter((movie) => {
			if (filters.query && !movie.title.toLowerCase().includes(filters.query.toLowerCase())) {
				return false;
			}
			if (filters.genre && !movie.genre.includes(filters.genre)) {
				return false;
			}
			if (filters.year && movie.year !== filters.year) {
				return false;
			}
			if (filters.rating && movie.rating < filters.rating) {
				return false;
			}
			if (filters.available !== undefined && movie.available !== filters.available) {
				return false;
			}
			return true;
		});
	}, [movies, filters]);

	const handleMovieRequest = (request: any) => {
		console.log('Movie request submitted:', request);
	};

	const clearFilters = () => {
		setFilters({
			query: '',
			genre: undefined,
			year: undefined,
			rating: undefined,
			available: undefined
		});
	};

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				<Group justify="space-between" align="center">
					<Title order={1}>Movie Streaming Directory</Title>
					<Button onClick={openRequestModal} size="md">
						Request a Movie
					</Button>
				</Group>

				<Paper p="md" withBorder>
					<Stack gap="md">
						<Title order={3} size="h4">Search & Filters</Title>

						<Grid>
							<Grid.Col span={{ base: 12, md: 6 }}>
								<TextInput
									placeholder="Search movies..."
									value={filters.query}
									onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
								/>
							</Grid.Col>

							<Grid.Col span={{ base: 12, md: 3 }}>
								<Select
									placeholder="Select genre"
									value={filters.genre}
									onChange={(value) => setFilters(prev => ({ ...prev, genre: value || undefined }))}
									data={GENRES}
									clearable
								/>
							</Grid.Col>

							<Grid.Col span={{ base: 12, md: 3 }}>
								<NumberInput
									placeholder="Year"
									value={filters.year}
									onChange={(value) => setFilters(prev => ({ ...prev, year: value as number || undefined }))}
									min={1900}
									max={new Date().getFullYear() + 5}
								/>
							</Grid.Col>
						</Grid>

						<Group>
							<NumberInput
								label="Minimum Rating"
								placeholder="e.g. 8.0"
								value={filters.rating}
								onChange={(value) => setFilters(prev => ({ ...prev, rating: value as number || undefined }))}
								min={0}
								max={10}
								step={0.1}
								decimalScale={1}
								w={150}
							/>

							<Switch
								label="Available only"
								checked={filters.available === true}
								onChange={(event) =>
									setFilters(prev => ({
										...prev,
										available: event.currentTarget.checked ? true : undefined
									}))
								}
							/>

							<Button variant="subtle" onClick={clearFilters}>
								Clear Filters
							</Button>
						</Group>
					</Stack>
				</Paper>

				<Group justify="space-between" align="center">
					<Text size="lg" fw={500}>
						{filteredMovies.length} movies found
					</Text>
				</Group>

				<Grid>
					{filteredMovies.map((movie) => (
						<Grid.Col key={movie.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
							<MovieCard movie={movie} />
						</Grid.Col>
					))}
				</Grid>

				{filteredMovies.length === 0 && (
					<Text ta="center" c="dimmed" size="lg" py="xl">
						No movies found matching your criteria.
					</Text>
				)}
			</Stack>

			<MovieRequestForm
				opened={requestModalOpened}
				onClose={closeRequestModal}
				onSubmit={handleMovieRequest}
			/>
		</Container>
	);
}
