-- migrate:up
ALTER TABLE movie_request RENAME TO movie_requests;
ALTER TABLE movie_requests RENAME COLUMN imdb_id TO omdb_id;

-- migrate:down
ALTER TABLE movie_requests RENAME TO movie_request;
ALTER TABLE movie_requests RENAME COLUMN omdb_id TO imdb_id;
