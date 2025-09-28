CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS movie_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imdb_id VARCHAR(20) NOT NULL,
  date_requested DATE DEFAULT now(),
  date_completed DATE,
  requested_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(25) NOT NULL,
  date_created DATE DEFAULT now()
)
