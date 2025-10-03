import { MovieRequestTable } from "src/movie-requests/types"
import { LocalMoviesTable } from "src/movies/types"
import { UsersTable } from "src/users/types"

export type Database = {
  local_movies: LocalMoviesTable
  movie_requests: MovieRequestTable
  users: UsersTable
}
