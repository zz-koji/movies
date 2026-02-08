# Movie Request Feature Expansion - Verification Steps

## Phase 1: Database Migration

### Run the migration
```bash
# From the project root
docker-compose exec postgres psql -U postgres -d movies_db -f /docker-entrypoint-initdb.d/migrations/20251015120000_expand_movie_requests.sql
```

Or use your migration tool (dbmate, etc.):
```bash
dbmate up
```

### Verify schema changes
```bash
docker-compose exec postgres psql -U postgres -d movies_db -c "\d movie_requests"
```

Expected columns:
- id (uuid)
- omdb_id (varchar(20), nullable)
- title (varchar(255), nullable)
- priority (varchar(10), default 'medium')
- status (varchar(20), default 'queued')
- notes (text, nullable)
- date_requested (date)
- date_completed (date, nullable)
- requested_by (uuid)

Expected indexes:
- idx_movie_requests_status
- idx_movie_requests_requested_by

---

## Phase 2: Server API Testing

### 1. Start the server
```bash
cd server
yarn start:dev
```

### 2. Test GET all requests (no auth required)
```bash
curl http://localhost:3000/movie-requests
```

Expected: Array of movie requests (may be empty)

### 3. Test POST create request (requires auth)

First, login to get auth cookie:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"your_username","pin":"your_pin"}' \
  -c cookies.txt
```

Then create a request:
```bash
curl -X POST http://localhost:3000/movie-requests \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "The Matrix",
    "priority": "high",
    "notes": "The original 1999 film",
    "omdb_id": "tt0133093"
  }'
```

Expected: Created request object with id, status='queued', etc.

### 4. Test GET single request
```bash
curl http://localhost:3000/movie-requests/{request_id}
```

### 5. Test PATCH update request (requires auth + ownership)
```bash
curl -X PATCH http://localhost:3000/movie-requests/{request_id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "priority": "low",
    "notes": "Changed my mind"
  }'
```

Expected: Updated request object

### 6. Test DELETE request (requires auth + ownership)
```bash
curl -X DELETE http://localhost:3000/movie-requests/{request_id} \
  -b cookies.txt
```

Expected: `{"success": true}`

### 7. Test unauthorized access
```bash
curl -X POST http://localhost:3000/movie-requests \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Movie", "priority": "medium"}'
```

Expected: 401 Unauthorized

---

## Phase 3: Client Testing

### 1. Start the client
```bash
cd client
yarn dev
```

### 2. Test Request Form
- Click "Request Movie" button (or login first if not authenticated)
- Fill in movie title: "Inception"
- Search OMDb: Type "Inception" in the search field
- Select a movie from the search results
- Verify the movie is linked (shows "Linked to: Inception (2010)")
- Select priority: "High"
- Add notes: "Great movie for movie night"
- Click "Submit request"
- Verify toast notification appears: "Request submitted"
- Verify form closes

### 3. Test Request Queue
- Verify the new request appears in the queue
- Check that it shows:
  - Title: "Inception"
  - Priority badge: "high priority"
  - Status badge: "Queued"
  - "Linked to OMDb" badge
  - Notes preview (if visible)
  - Relative time: "just now" or similar
  - Delete button (trash icon) if you're the owner

### 4. Test Delete Request
- Click the trash icon on your own request
- Verify toast notification: "Request deleted"
- Verify the request animates out and disappears
- Verify the queue count decreases

### 5. Test Loading States
- Open browser DevTools Network tab
- Throttle network to "Slow 3G"
- Submit a new request
- Verify:
  - Submit button shows loading spinner
  - Form fields are disabled during submission
  - Optimistic update shows request immediately
  - Request persists after server response

### 6. Test Error Handling
- Stop the server
- Try to submit a request
- Verify error toast appears: "Request failed"
- Verify optimistic update is rolled back
- Restart server and try again

### 7. Test Ownership
- Login as User A
- Create a request
- Logout and login as User B
- Verify User B cannot see delete button on User A's request
- Try to delete User A's request via API (should fail with 403)

---

## Phase 4: Edge Cases

### 1. Request without OMDb link
- Create a request without searching/selecting an OMDb movie
- Verify it saves with omdb_id as null
- Verify it displays without "Linked to OMDb" badge

### 2. Long notes
- Create a request with very long notes (500+ characters)
- Verify notes are truncated in the queue view
- Verify full notes are visible in expanded view (if implemented)

### 3. Multiple requests
- Create 10+ requests
- Verify scrolling works in the queue
- Verify all requests load correctly
- Verify status counts are accurate

### 4. Empty state
- Delete all requests
- Verify empty state shows:
  - Icon
  - "No requests yet" message
  - Helpful description

---

## Phase 5: Animation Testing

### 1. Slide-up animation
- Create a new request
- Watch it appear in the queue with slide-up animation
- Delete a request
- Watch it animate out smoothly

### 2. Optimistic updates
- Create a request
- Verify it appears immediately (before server response)
- Verify it updates with real data after server response

---

## Checklist

- [ ] Database migration runs successfully
- [ ] All new columns and indexes exist
- [ ] GET /movie-requests returns array
- [ ] POST /movie-requests creates request (with auth)
- [ ] POST /movie-requests returns 401 without auth
- [ ] PATCH /movie-requests updates request (owner only)
- [ ] DELETE /movie-requests deletes request (owner only)
- [ ] Request form opens and closes
- [ ] OMDb search works in form
- [ ] Movie selection links to request
- [ ] Notes field saves correctly
- [ ] Toast notifications appear on success
- [ ] Toast notifications appear on error
- [ ] Requests appear in queue immediately (optimistic)
- [ ] Delete button only shows for own requests
- [ ] Delete removes request with animation
- [ ] Loading states work correctly
- [ ] Error states work correctly
- [ ] Empty state displays correctly
- [ ] Status counts are accurate
- [ ] Priority badges display correctly
- [ ] Relative timestamps work
- [ ] Scrolling works with many requests

---

## Rollback (if needed)

If you need to rollback the migration:

```bash
# Run the down migration
dbmate down
```

Or manually:
```sql
DROP INDEX IF EXISTS idx_movie_requests_status;
DROP INDEX IF EXISTS idx_movie_requests_requested_by;
ALTER TABLE movie_requests
  DROP COLUMN title,
  DROP COLUMN priority,
  DROP COLUMN status,
  DROP COLUMN notes,
  ALTER COLUMN omdb_id SET NOT NULL;
```
