# Quick Start Guide - Movie Request Feature

## Prerequisites
- Docker and docker-compose running
- Node.js and Yarn installed
- Database is running

## Step 1: Run Database Migration

### Option A: Using dbmate (if installed)
```bash
dbmate up
```

### Option B: Manual SQL execution
```bash
# Copy migration to postgres container
docker cp db/migrations/20251015120000_expand_movie_requests.sql movies-postgres-1:/tmp/

# Execute migration
docker-compose exec postgres psql -U postgres -d movies_db -f /tmp/20251015120000_expand_movie_requests.sql
```

### Option C: Using psql directly
```bash
docker-compose exec postgres psql -U postgres -d movies_db << 'EOF'
ALTER TABLE movie_requests
  ADD COLUMN title VARCHAR(255),
  ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed')),
  ADD COLUMN notes TEXT,
  ALTER COLUMN omdb_id DROP NOT NULL;

CREATE INDEX idx_movie_requests_status ON movie_requests(status);
CREATE INDEX idx_movie_requests_requested_by ON movie_requests(requested_by);
EOF
```

## Step 2: Verify Migration

```bash
docker-compose exec postgres psql -U postgres -d movies_db -c "\d movie_requests"
```

You should see the new columns: title, priority, status, notes

## Step 3: Start the Server

```bash
cd server
yarn install  # if needed
yarn start:dev
```

Server should start on http://localhost:3000

## Step 4: Start the Client

```bash
cd client
yarn install  # if needed (date-fns was added)
yarn dev
```

Client should start on http://localhost:5173

## Step 5: Test the Feature

1. **Open the app**: http://localhost:5173
2. **Login** (if not already logged in)
3. **Click "Request Movie"** button
4. **Fill in the form**:
   - Title: "Inception"
   - Search OMDb: Type "Inception" and select from results
   - Priority: "High"
   - Notes: "Great movie for movie night"
5. **Submit** and watch for success toast
6. **Check the Request Queue** - your request should appear
7. **Delete the request** - click the trash icon

## Troubleshooting

### Migration fails with "column already exists"
The migration may have already run. Check with:
```bash
docker-compose exec postgres psql -U postgres -d movies_db -c "\d movie_requests"
```

### Server won't start
- Check if port 3000 is available
- Check server logs for errors
- Verify database connection in .env

### Client won't start
- Check if port 5173 is available
- Run `yarn install` to ensure date-fns is installed
- Check for TypeScript errors

### Requests not appearing
- Check browser console for errors
- Verify server is running and accessible
- Check network tab for failed API calls
- Verify you're logged in for creating requests

### Can't delete requests
- Verify you're logged in
- Verify you're the owner of the request
- Check browser console for 403 errors

## API Endpoints

### Public (No Auth)
- `GET /movie-requests` - List all requests
- `GET /movie-requests/:id` - Get single request

### Authenticated
- `POST /movie-requests` - Create request
- `PATCH /movie-requests/:id` - Update request (owner only)
- `DELETE /movie-requests/:id` - Delete request (owner only)

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"your_username","pin":"your_pin"}' \
  -c cookies.txt
```

### Create Request
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

### List Requests
```bash
curl http://localhost:3000/movie-requests
```

### Delete Request
```bash
curl -X DELETE http://localhost:3000/movie-requests/{request_id} \
  -b cookies.txt
```

## Success Indicators

✅ Migration runs without errors
✅ Server starts successfully
✅ Client starts successfully
✅ Can create requests
✅ Requests appear in queue
✅ Toast notifications appear
✅ Can delete own requests
✅ OMDb search works
✅ Animations are smooth

## Need Help?

See `VERIFICATION_STEPS.md` for detailed testing procedures.
See `IMPLEMENTATION_SUMMARY.md` for technical details.
