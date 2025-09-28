import { MovieRequest as MovieRequestTable } from "src/movie-requests/types"
import { User as UsersTable } from "src/users/types"

export type Database = {
	movie_requests: MovieRequestTable
	users: UsersTable
}
