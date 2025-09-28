-- migrate:up
ALTER TABLE users
ADD CONSTRAINT unique_name UNIQUE (name);

-- migrate:down
ALTER TABLE users
DROP CONSTRAINT unique_name;
