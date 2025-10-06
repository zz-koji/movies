-- migrate:up
CREATE TABLE IF NOT EXISTS movie_metadata (
  omdb_id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  year INTEGER,
  genre TEXT,
  director TEXT,
  actors TEXT,
  imdb_rating NUMERIC(3, 1),
  runtime INTEGER,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_metadata_title ON movie_metadata USING gin (to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_movie_metadata_genre ON movie_metadata USING gin (to_tsvector('simple', COALESCE(genre, '')));
CREATE INDEX IF NOT EXISTS idx_movie_metadata_updated_at ON movie_metadata (updated_at DESC);

-- migrate:down
DROP TABLE IF EXISTS movie_metadata;
