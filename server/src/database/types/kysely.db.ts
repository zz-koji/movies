import { MovieRequestTable } from 'src/movie-requests/types';
import { LocalMoviesTable, MovieMetadataTable } from 'src/movies/types';
import { UsersTable } from 'src/users/types';
import { NotificationTable } from 'src/notifications/types';
import { CommentTable } from 'src/comments/types';
import { AuditLogTable } from 'src/audit/types';

export type Database = {
  local_movies: LocalMoviesTable;
  movie_metadata: MovieMetadataTable;
  movie_requests: MovieRequestTable;
  users: UsersTable;
  notifications: NotificationTable;
  request_comments: CommentTable;
  audit_log: AuditLogTable;
};
