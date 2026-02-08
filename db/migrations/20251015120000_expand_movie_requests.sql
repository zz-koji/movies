-- migrate:up
ALTER TABLE movie_requests
  ADD COLUMN title VARCHAR(255),
  ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed')),
  ADD COLUMN notes TEXT,
  ALTER COLUMN omdb_id DROP NOT NULL;

CREATE INDEX idx_movie_requests_status ON movie_requests(status);
CREATE INDEX idx_movie_requests_requested_by ON movie_requests(requested_by);

-- migrate:down
DROP INDEX IF EXISTS idx_movie_requests_status;
DROP INDEX IF EXISTS idx_movie_requests_requested_by;
ALTER TABLE movie_requests
  DROP COLUMN title,
  DROP COLUMN priority,
  DROP COLUMN status,
  DROP COLUMN notes,
  ALTER COLUMN omdb_id SET NOT NULL;
