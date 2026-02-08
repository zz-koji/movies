# Movie Library UX Improvements Design

**Date:** 2026-02-08
**Status:** Approved
**Focus:** Mobile-first UX improvements across discovery, requesting, and admin management

---

## Problem Statement

The current movie library interface has friction points that hurt the user experience, especially on mobile devices:

1. **Discovery & Request Flow**: Users find unavailable movies but must navigate through modals to request them
2. **Search Experience**: Both browsers and targeted searchers need quicker paths from search to action
3. **Admin Management**: Single admin managing manual download workflow needs better efficiency tools
4. **Mobile Experience**: Modal-heavy interactions are disruptive on mobile; opening/closing forms is tedious

### User Behaviors
- **Mixed usage**: Users both browse (discover) and search (targeted)
- **Mobile-first**: Primary device for requesting movies
- **Manual workflow**: Admin downloads movies manually, then uploads via interface
- **Single admin**: Focus on personal efficiency, not collaboration

---

## Design Principles

1. **Reduce modal friction** - Inline actions over modals wherever possible
2. **Mobile-first** - Design for touch, optimize for one-handed use
3. **Smart defaults** - Minimize required fields, auto-fill when possible
4. **Instant feedback** - Optimistic UI, immediate confirmation
5. **Progressive disclosure** - Simple by default, advanced options available

---

## Architecture Overview

### Three Request Patterns

**1. Inline Quick Request** (zero-modal)
- Direct action from movie cards
- One tap to request unavailable movies
- Toast notification for feedback

**2. Express Search-to-Request** (minimal interaction)
- Prominent header search
- Inline results with immediate actions
- Local library + OMDb integration

**3. Full Request Form** (advanced, optional)
- Kept for detailed requests
- Streamlined to essential fields
- Accessible but not primary path

---

## Component Design

### 1. Movie Card Enhancements

#### Unavailable Movie Cards

**Current state:**
```
[Watch (disabled)] [Add to watchlist]
```

**New state:**
```
[Watch (disabled)] [Request Movie]
```

**After request submitted:**
```
[Watch (disabled)] [Requested ✓]
```

#### Available Movie Cards (authenticated)
```
[Watch] [Delete]
```

#### Request Flow
1. User taps "Request Movie"
2. Button shows "Requesting..." (optimistic UI)
3. API call fires with defaults:
   - `title`: movie.title
   - `priority`: "medium"
   - `omdb_id`: movie.imdb_id (if available)
   - `notes`: undefined
4. Success → Toast: "✓ [Movie Title] requested"
5. Button updates: "Requested ✓" (disabled)

#### State Persistence
- Track requested movie IDs in context/localStorage
- Survive page refreshes
- Cards check requested state on render

#### Mobile Optimization
- Buttons stack vertically on small screens
- Full-width on mobile
- 44px minimum touch targets
- Request button: Grape/purple color (matches "Coming soon" badge)

---

### 2. Express Search Component

#### Header Integration

**Desktop:**
```
[Search movies...        🔍] [Request Movie] [Admin] [Login]
```

**Mobile:**
```
[Search movies...        🔍]
[Request Movie] [Login]
```

#### Search Behavior

**Activation:** 2+ characters, 500ms debounce

**Priority 1: Local Library** (instant)
- Available movies: `[Title] (2024) ⭐8.5 [Watch →]`
- Unavailable movies: `[Title] (2024) ⭐8.5 [Request]`

**Priority 2: OMDb Results** (if no local matches)
- `[Title] (2024) • Movie [Request]`
- Max 5-8 results
- Gray out if already requested

**Recent Searches** (empty input, focused)
- Show last 3-5 searches
- Quick access to repeat searches

#### Interaction
- Results: Dropdown overlay (no navigation)
- Tap result → Action executes → Dropdown closes
- Tap outside / ESC → Close
- Keyboard nav: Arrow keys + Enter (desktop)

#### Loading States
- Spinner in search input while fetching
- Skeleton loaders for results

---

### 3. Request Form (Streamlined)

**When to use:** Advanced requests with notes/details

**Renamed:** "Advanced Request" or "Request with Details"

**Fields:**
- **Title** (required): Auto-filled if from search
- **OMDb Search** (optional): Background linking, can be fixed later
- **Priority** (optional): Defaults to "medium", collapsed by default
- **Notes** (optional): Expansion panel ("Add notes?")

**Form behavior:**
- Bottom sheet on mobile (easier reach)
- Centered modal on desktop
- Submit → Toast feedback → Auto-close

---

### 4. Admin Dashboard: Request Management

#### Enhanced Table

**New Quick Filters** (above table)
```
[Needs Action (12)] [In Progress (3)] [Completed (45)] [All (60)]
```
- Default view: "Needs Action" (queued)
- Show counts in badges
- One-click filtering

#### Actions Column (Enhanced)

**Replace single "Delete" with action menu:**
- Mark as Processing
- Mark as Completed
- Add Admin Note
- Delete

**Admin Notes:**
- Private notes field per request
- Use cases: "Found on X", "Quality: 1080p", "Can't find"
- Shows truncated in table, click to expand
- Editable inline or in modal

#### Desktop Interactions
- Right-click context menu on rows
- Drag to reorder within "Queued" (set priority)

#### Mobile Interactions
- Swipe right → Mark as Processing
- Swipe left → Delete (with confirmation)
- Tap row → Expand details with actions

#### Bulk Actions (Enhanced)
- Existing: Bulk status update, bulk delete
- Keep selection UI (checkboxes)
- Mobile: Bottom action bar when items selected

---

### 5. Admin Dashboard: Additional Tabs

#### Tab Structure
```
[Requests (12)] [Movies] [Users] [Stats]
```

#### Movies Tab

**Search & Filter:**
- Search by title
- Filter: All / Available / Unavailable / Missing Video
- Sort: Title / Date Added / Rating / Duration

**Bulk Actions:**
- Select movies → Bulk delete
- Select unavailable → Mark as available
- Export list (CSV/JSON)

**Per-Movie Actions:**
- Edit metadata (title, year, genres, etc.)
- Re-fetch OMDb data
- Delete (with confirmation)

**View:**
- Table on desktop
- Card list on mobile

#### Users Tab

**User Table:**
- Columns: Username, Email, Role, Request Count, Join Date
- Actions: Edit Role, Delete User

**Quick Stats:**
- Total users
- Most active requesters (top 5)
- Recent signups (last 7 days)

**Roles:**
- Admin: Full access
- User: Can request movies
- Viewer (future): Watch-only

#### Stats Tab

**Analytics:**
- Total movies / requests over time (simple line chart)
- Most requested genres (bar chart)
- Average request completion time
- Storage usage (if available from backend)

**Export:**
- Download stats as CSV

---

## Mobile-First Optimizations

### Touch Design
- **44px minimum** touch targets
- Increased padding on all interactive elements
- Swipe gestures for admin actions
- Bottom sheets instead of centered modals

### Performance
- **Lazy load** movie posters (IntersectionObserver)
- **Virtual scrolling** for long lists (admin table)
- **Debounced search** (500ms)
- **Optimistic UI** (instant feedback before API response)

### Navigation
- **Sticky search bar** (visible while scrolling)
- **Back to top FAB** (appears after scrolling down)
- **Horizontal scroll** for request queue/upload sections on mobile

---

## Notification System

### Toast Notifications

**Replace basic alerts with toast system:**

**Types:**
- Success: `✓ Movie requested: [Title]`
- Info: `ℹ Processing 3 requests...`
- Error: `⚠ Request failed: [reason]`

**Behavior:**
- Position: Bottom on mobile, top-right on desktop
- Auto-dismiss: 3s (success), 5s (error), manual (persistent)
- Stack multiple toasts
- Swipe to dismiss on mobile

### Request Status Updates

**NotificationBell enhancements:**
- Badge count for new updates
- Click → List of updates
- Example: "Your request 'Inception' is now Processing!"
- Real-time updates (polling or WebSocket)

---

## Edge Cases & Error Handling

### Duplicate Requests
- Check if movie already requested before allowing request
- Show "Already Requested" button state (disabled)
- Toast: "This movie has already been requested"

### Offline Mode
- Queue requests in localStorage when offline
- Sync automatically when connection restored
- Show offline indicator

### Slow Connections
- Skeleton loaders for all async content
- Optimistic UI for actions
- Timeout warnings after 10s

### Empty States
- No movies: "Your library is empty. Upload or request movies to get started."
- No requests: "No pending requests. Browse the library and request movies."
- No search results: "No movies found. Try a different search or request from OMDb."
- Helpful CTAs in all empty states

### Validation
- Prevent empty requests (title required)
- Prevent duplicate simultaneous requests
- API error handling with user-friendly messages

---

## Data Flow

### Quick Request Flow
```
User taps "Request" on card
  ↓
Optimistic UI update (button → "Requesting...")
  ↓
POST /api/requests { title, priority: "medium", omdb_id }
  ↓
Success → Toast notification + Button → "Requested ✓"
  ↓
Update local state (requested movie IDs)
  ↓
Persist to localStorage
```

### Express Search Flow
```
User types in search (2+ chars)
  ↓
Debounce 500ms
  ↓
Search local library first (instant)
  ↓
If no results → Search OMDb (network)
  ↓
Show combined results
  ↓
User taps "Watch" or "Request"
  ↓
Action executes → Dropdown closes → Toast feedback
```

### Admin Request Processing Flow
```
Admin sees request in "Needs Action" tab
  ↓
Clicks "Mark as Processing" + adds note "Downloading from X"
  ↓
Request moves to "In Progress" tab
  ↓
Admin downloads movie manually
  ↓
Admin uploads via MovieUploadSection
  ↓
Admin marks request as "Completed"
  ↓
User receives notification (if implemented)
```

---

## Technical Considerations

### State Management
- **Requested movies**: Context + localStorage
- **Search results**: React Query cache
- **Admin filters**: URL params (shareable, bookmarkable)

### API Changes Needed
- Quick request endpoint: Accept minimal payload
- Admin notes: Add `admin_notes` field to requests table
- Duplicate check: Endpoint to check if movie already requested
- User management: CRUD endpoints for users

### Component Structure
```
components/
├── QuickSearch/
│   ├── QuickSearch.tsx
│   ├── SearchResults.tsx
│   └── RecentSearches.tsx
├── MovieCard.tsx (enhanced)
├── MovieRequestForm.tsx (streamlined)
├── admin/
│   ├── AdminDashboard.tsx (tabbed)
│   ├── RequestsTab.tsx (enhanced)
│   ├── MoviesTab.tsx (new)
│   ├── UsersTab.tsx (new)
│   └── StatsTab.tsx (new)
└── notifications/
    ├── ToastNotification.tsx
    └── NotificationBell.tsx (enhanced)
```

### Libraries
- **Toast notifications**: `react-hot-toast` or Mantine notifications
- **Virtual scrolling**: `@tanstack/react-virtual`
- **Charts**: `recharts` (lightweight)
- **Swipe gestures**: `react-swipeable` or Mantine hooks

---

## Implementation Phases

### Phase 1: Quick Request Foundation
- Movie card inline request button
- Quick request API endpoint
- Toast notification system
- Requested state tracking

### Phase 2: Express Search
- Header search component
- Local library search
- OMDb integration
- Recent searches

### Phase 3: Admin Enhancements
- Quick filters and tabs
- Admin notes field
- Enhanced actions menu
- Mobile swipe actions

### Phase 4: Additional Admin Tabs
- Movies tab
- Users tab
- Stats tab

### Phase 5: Polish & Optimization
- Mobile optimizations
- Performance improvements
- Edge case handling
- Testing & refinement

---

## Success Metrics

### User Experience
- Time from "want movie" to "requested": < 5 seconds (currently ~30s)
- Mobile request completion rate: > 90%
- User satisfaction with request process

### Admin Efficiency
- Time to process request: < 2 minutes (triage → download → upload → complete)
- Number of requests processed per session: +50%
- Admin satisfaction with management tools

### Technical
- Search response time: < 200ms (local), < 1s (OMDb)
- Page load time: < 2s (mobile)
- No modal-related bounce rate

---

## Future Enhancements

- **Automated downloads**: Integrate with download services (Radarr, etc.)
- **Collaborative requests**: Multiple users can upvote requests
- **Watchlist feature**: Personal watchlists for users
- **Smart recommendations**: Based on viewing history
- **Mobile app**: PWA or native app
- **Multi-admin support**: Assignment, collaboration features

---

## Appendix: Design Mockups

### Movie Card States

**Unavailable Movie (Before Request):**
```
┌─────────────────────────┐
│    [Movie Poster]       │
│  ⭐ 8.5    Coming Soon  │
└─────────────────────────┘
  Inception
  2010 • 148 min • Nolan
  [Action] [Sci-Fi]

  A thief who steals...

  ┌───────────┐ ┌──────────┐
  │   Watch   │ │ Request  │
  │ (disabled)│ │  Movie   │
  └───────────┘ └──────────┘
```

**Unavailable Movie (After Request):**
```
  ┌───────────┐ ┌──────────┐
  │   Watch   │ │Requested │
  │ (disabled)│ │    ✓     │
  └───────────┘ └──────────┘
```

### Express Search Results

```
┌─────────────────────────────────┐
│ Search movies...            🔍  │
└─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │ LOCAL LIBRARY                   │
  │ ┌─────────────────────────────┐ │
  │ │ Inception (2010) ⭐8.5      │ │
  │ │ Available        [Watch →]  │ │
  │ └─────────────────────────────┘ │
  │ ┌─────────────────────────────┐ │
  │ │ Interstellar (2014) ⭐8.6   │ │
  │ │ Coming Soon      [Request]  │ │
  │ └─────────────────────────────┘ │
  │                                 │
  │ OMDB RESULTS                    │
  │ ┌─────────────────────────────┐ │
  │ │ The Prestige (2006) • Movie │ │
  │ │                   [Request]  │ │
  │ └─────────────────────────────┘ │
  └─────────────────────────────────┘
```

### Admin Dashboard (Requests Tab)

```
┌─────────────────────────────────────────────┐
│ [Needs Action (12)] [In Progress (3)]       │
│ [Completed (45)] [All (60)]                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Title          | User    | Priority | Action│
├─────────────────────────────────────────────┤
│ Inception      | Alice   | High  🔴 | ⋮     │
│ "Found on X"                                │
├─────────────────────────────────────────────┤
│ Interstellar   | Bob     | Med   🟡 | ⋮     │
├─────────────────────────────────────────────┤
│ The Prestige   | Charlie | Low   ⚪ | ⋮     │
└─────────────────────────────────────────────┘
```

---

**End of Design Document**
