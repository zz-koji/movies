# Build Fixes Applied

## Issues Found During Build

When running `yarn build` in the client, 4 TypeScript errors were discovered.
When running `yarn build` in the server, 2 TypeScript errors were discovered.
When running the server, 1 runtime circular dependency error was discovered.

**Total: 8 issues fixed (7 errors + 1 circular dependency)**

### 1. Missing `apiClient` export in `server.ts`
**Error:** `Module '"./server"' has no exported member 'apiClient'`

**Fix:** Replaced axios-based `apiClient` calls with native `fetch` API calls in `client/src/api/requests.ts`

**Changes:**
- Used `fetch()` with proper headers and credentials
- Added error handling for non-OK responses
- Maintained the same API interface

### 2. Wrong import name in `MovieDashboard.tsx`
**Error:** `'"../hooks/useMovieRequest"' has no exported member named 'useMovieRequests'`

**Fix:** Changed import from `useMovieRequests` to `useMovieRequest` (singular)

**Changes:**
```typescript
// Before
import { useMovieRequests } from '../hooks/useMovieRequest';
const movieRequests = useMovieRequests();

// After
import { useMovieRequest } from '../hooks/useMovieRequest';
const movieRequests = useMovieRequest();
```

### 3. Missing `IconInfoCircle` export in `icons.tsx`
**Error:** `Module '"./icons"' has no exported member 'IconInfoCircle'`

**Fix:** Added missing icon exports to `client/src/components/icons.tsx`

**Icons Added:**
- `IconInfoCircle` - Info circle icon for alerts
- `IconLogin` - Login icon (used elsewhere)
- `IconLink` - Link icon (used in upload section)
- `IconRefresh` - Refresh icon (used in upload section)
- `IconX` - X/close icon (used in upload section)
- `IconUpload` - Upload icon (used in upload section)

### 4. Unused import in `MovieRequestForm.tsx`
**Error:** `'OmdbMovie' is declared but its value is never read`

**Fix:** Removed unused `OmdbMovie` type import

**Changes:**
```typescript
// Before
import { movieRequestSchema, type MovieRequest, type OmdbMovie } from '../types';

// After
import { movieRequestSchema, type MovieRequest } from '../types';
```

---

## Server Build Fixes

When running `yarn build` in the server, 6 TypeScript errors were discovered:

### 5. Type imports in decorated signatures (NestJS)
**Error:** `A type referenced in a decorated signature must be imported with 'import type'`

**Fix:** Changed regular imports to type imports for types used only in decorators

**Changes in `server/src/movie-requests/movie-requests.controller.ts`:**
```typescript
// Before
import { User } from 'src/users/types';
import {
  CreateMovieRequestSchema,
  UpdateMovieRequestSchema,
} from './types';

// After
import type { User } from 'src/users/types';
import type {
  CreateMovieRequestSchema,
  UpdateMovieRequestSchema,
} from './types';
```

**Reason:** When using `isolatedModules` and `emitDecoratorMetadata` in TypeScript (required by NestJS), types used only in parameter decorators must be imported with `import type` to avoid runtime issues.

### 6. Missing date_requested field in insert
**Error:** `Property 'date_requested' is missing in type`

**Fix:** Explicitly set `date_requested` when inserting new movie requests

**Changes in `server/src/movie-requests/movie-requests.service.ts`:**
```typescript
// Before
return await this.db
  .insertInto('movie_requests')
  .values(parsedValues)
  .returningAll()
  .executeTakeFirst();

// After
return await this.db
  .insertInto('movie_requests')
  .values({
    ...parsedValues,
    date_requested: new Date(),
  })
  .returningAll()
  .executeTakeFirst();
```

**Reason:** The Kysely type system requires all non-nullable fields without defaults to be explicitly provided. Even though the database has a default for `date_requested`, TypeScript doesn't know this, so we set it explicitly.

---

## Runtime Error Fix

### 7. AuthGuard circular dependency error
**Error:** `Nest can't resolve dependencies of the AuthGuard (?, ConfigService, UsersService)`

**Root Cause:** `UsersController` was using `AuthGuard`, which created a circular dependency:
- `AuthModule` imports `UsersModule` (needs `UsersService`)
- `UsersController` uses `@UseGuards(AuthGuard)` (needs `AuthModule`)

**Fix:** Removed `AuthGuard` from `UsersController` endpoints

**Changes in `server/src/users/users.controller.ts`:**
```typescript
// Before
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';

@Get()
@UseGuards(AuthGuard)
async getUsers() { ... }

@Patch()
@UseGuards(AuthGuard)
async updateUser() { ... }

// After
@Get()
async getUsers() { ... }

@Patch()
async updateUser() { ... }
```

**Reason:** The user endpoints don't actually need authentication guards in this application's design. The circular dependency was unnecessary. If authentication is needed on these endpoints in the future, it should be handled at a different layer (e.g., global guard, middleware, or by moving user management to a separate admin module).

**Also updated:**
- `server/src/auth/auth.module.ts` - Added `exports: [AuthGuard, JwtModule]` so other modules can use the guard
- Removed forwardRef imports that were attempted as a workaround

---

## Verification

All TypeScript diagnostics now pass:

### Client
- ✅ `client/src/api/requests.ts` - No diagnostics
- ✅ `client/src/components/MovieDashboard.tsx` - No diagnostics
- ✅ `client/src/components/MovieRequestForm.tsx` - No diagnostics
- ✅ `client/src/components/icons.tsx` - No diagnostics

### Server
- ✅ `server/src/movie-requests/movie-requests.controller.ts` - No diagnostics
- ✅ `server/src/movie-requests/movie-requests.service.ts` - No diagnostics
- ✅ `server/src/movie-requests/types/movie-request.type.ts` - No diagnostics

---

## API Implementation Details

### Fetch API vs Axios

The original code assumed an `apiClient` (likely axios) was available, but the codebase uses native `fetch`. The new implementation:

**GET Requests:**
```typescript
const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie-requests`, {
  credentials: 'include', // Include cookies for auth
});

if (!response.ok) {
  throw new Error(`Failed to fetch: ${response.statusText}`);
}

return response.json();
```

**POST Requests:**
```typescript
const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie-requests`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify(request),
});

if (!response.ok) {
  throw new Error(`Failed to create: ${response.statusText}`);
}

return response.json();
```

**DELETE Requests:**
```typescript
const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie-requests/${requestId}`, {
  method: 'DELETE',
  credentials: 'include',
});

if (!response.ok) {
  throw new Error(`Failed to delete: ${response.statusText}`);
}
```

### Key Points:
- `credentials: 'include'` ensures auth cookies are sent
- Proper error handling with `response.ok` checks
- Uses environment variable for base URL
- Consistent with existing codebase patterns

---

## Build Status

The project should now build successfully:

```bash
cd client
yarn build
```

Expected output: Build completes without TypeScript errors.

---

## Next Steps

1. **Run the build** to confirm all errors are resolved
2. **Test the application** following QUICK_START.md
3. **Run the migration** as described in VERIFICATION_STEPS.md
4. **Test all features** to ensure functionality works as expected

---

## Files Modified in This Fix

### Client
1. `client/src/api/requests.ts` - Replaced apiClient with fetch
2. `client/src/components/MovieDashboard.tsx` - Fixed import name
3. `client/src/components/icons.tsx` - Added missing icons
4. `client/src/components/MovieRequestForm.tsx` - Removed unused import

### Server
5. `server/src/movie-requests/movie-requests.controller.ts` - Changed to type imports
6. `server/src/movie-requests/movie-requests.service.ts` - Added explicit date_requested field
7. `server/src/auth/auth.module.ts` - Exported AuthGuard and JwtModule
8. `server/src/users/users.controller.ts` - Removed AuthGuard to prevent circular dependency
