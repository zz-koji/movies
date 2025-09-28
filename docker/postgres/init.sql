CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE movie_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imdb_id VARCHAR(20) NOT NULL,
  date_requested DATE DEFAULT now(),
  date_completed DATE,
  requested_by UUID NOT NULL
);
