import { MovieRequest as MovieRequestTable } from "src/movie-requests/types"
import { UsersTable } from "src/users/types"

export type Database = {
	movie_requests: MovieRequestTable
	users: UsersTable
}
