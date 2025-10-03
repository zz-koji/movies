-- migrate:up
ALTER TABLE local_movies ADD COLUMN omdb_id varchar(255) NOT NULL;

-- migrate:down
ALTER TABLE local_movies DROP COLUMN omdb_id;
