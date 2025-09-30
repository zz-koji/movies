-- migrate:up
ALTER TABLE users ADD COLUMN pin VARCHAR(6);

-- migrate:down
ALTER TABLE users DROP COLUMN pin;
