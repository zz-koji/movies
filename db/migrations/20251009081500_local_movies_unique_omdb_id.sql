-- migrate:up
ALTER TABLE local_movies ADD CONSTRAINT local_movies_omdb_id_key UNIQUE (omdb_id);

-- migrate:down
ALTER TABLE local_movies DROP CONSTRAINT local_movies_omdb_id_key;
