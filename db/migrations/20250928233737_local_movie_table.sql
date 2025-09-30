-- migrate:up
CREATE TABLE local_movies (
  id UUID DEFAULT uuid_generate_v4() NOT NULL,
  title VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  movie_file_key VARCHAR(255) NOT NULL,
  subtitle_file_key VARCHAR(255)
);

-- migrate:down
DROP TABLE local_movies;
