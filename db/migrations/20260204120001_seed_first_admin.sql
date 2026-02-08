-- migrate:up

-- Set the first user (by date_created) as admin
UPDATE users
SET role = 'admin'
WHERE id = (
  SELECT id FROM users ORDER BY date_created ASC LIMIT 1
);

-- migrate:down

-- Revert all admins to regular users
UPDATE users SET role = 'user' WHERE role = 'admin';
