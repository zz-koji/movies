-- migrate:up

-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Ensure local_movies has a primary key (missing from original schema)
ALTER TABLE local_movies ADD CONSTRAINT local_movies_pkey PRIMARY KEY (id);

-- Add fulfillment columns to movie_requests table
ALTER TABLE movie_requests
  ADD COLUMN fulfilled_by UUID REFERENCES users(id),
  ADD COLUMN fulfilled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN fulfilled_movie_id UUID REFERENCES local_movies(id);

-- Create index for filtering by fulfilled_by
CREATE INDEX idx_movie_requests_fulfilled_by ON movie_requests(fulfilled_by);

-- Create notifications table for in-app notification center
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Create request_comments table
CREATE TABLE request_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES movie_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_request_comments_request ON request_comments(request_id);
CREATE INDEX idx_request_comments_user ON request_comments(user_id);

-- Create audit_log table for tracking admin actions
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON audit_log(admin_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Create index for fuzzy title matching on movie_requests
CREATE INDEX idx_movie_requests_title_trgm ON movie_requests USING gin (title gin_trgm_ops);

-- migrate:down

DROP INDEX IF EXISTS idx_movie_requests_title_trgm;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS request_comments;
DROP TABLE IF EXISTS notifications;
DROP INDEX IF EXISTS idx_movie_requests_fulfilled_by;
ALTER TABLE movie_requests
  DROP COLUMN IF EXISTS fulfilled_movie_id,
  DROP COLUMN IF EXISTS fulfilled_at,
  DROP COLUMN IF EXISTS fulfilled_by;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE local_movies DROP CONSTRAINT IF EXISTS local_movies_pkey;
DROP EXTENSION IF EXISTS pg_trgm;
