# Phase 1: Quick Request Foundation - Test Plan

## Overview

This document outlines manual and automated tests for the Quick Request functionality.

## Unit Tests (Future Implementation)

### RequestedMoviesContext Tests

**File:** `client/src/context/RequestedMoviesContext.test.tsx`

```typescript
describe('RequestedMoviesContext', () => {
  describe('localStorage persistence', () => {
    it('should load requested movie IDs from localStorage on mount')
    it('should save requested movie IDs to localStorage on change')
    it('should handle corrupted localStorage data gracefully')
    it('should return empty Set if localStorage is unavailable')
  })

  describe('server sync', () => {
    it('should fetch and sync movie requests on mount')
    it('should filter out completed requests')
    it('should extract omdb_id from requests')
    it('should fallback to localStorage on server error')
  })

  describe('addRequestedMovie', () => {
    it('should add movie ID to Set')
    it('should not create new Set if ID already exists (no-op)')
    it('should trigger localStorage save')
  })

  describe('removeRequestedMovie', () => {
    it('should remove movie ID from Set')
    it('should not create new Set if ID does not exist (no-op)')
    it('should trigger localStorage save')
  })

  describe('isMovieRequested', () => {
    it('should return true if movie ID is in Set')
    it('should return false if movie ID is not in Set')
  })
})
```

### useQuickRequest Hook Tests

**File:** `client/src/hooks/useQuickRequest.test.tsx`

```typescript
describe('useQuickRequest', () => {
  describe('quickRequest', () => {
    it('should call createMovieRequest with correct payload')
    it('should set requestingMovieId during mutation')
    it('should add movie to requested set on success')
    it('should show success toast on success')
    it('should clear requestingMovieId on success')
    it('should show error toast on failure')
    it('should clear requestingMovieId on error')
    it('should not request if movie already requested')
  })

  describe('isRequesting', () => {
    it('should return true if movie ID matches requestingMovieId')
    it('should return false if movie ID does not match')
  })

  describe('isRequested', () => {
    it('should delegate to context isMovieRequested')
  })
})
```

### MovieCard Component Tests

**File:** `client/src/components/MovieCard.test.tsx`

```typescript
describe('MovieCard', () => {
  describe('RequestButton', () => {
    it('should show "Request Movie" for unavailable, unrequested movies')
    it('should show "Requested ✓" for already requested movies')
    it('should show "Requesting..." during request')
    it('should call quickRequest on click')
    it('should be disabled when already requested')
    it('should use grape color')
    it('should not render for available movies')
  })

  describe('responsive layout', () => {
    it('should stack buttons vertically on mobile')
    it('should show buttons in row on desktop')
    it('should use fullWidth on mobile')
    it('should use flex:1 on desktop')
  })
})
```

## Integration Tests (Future Implementation)

### End-to-End Quick Request Flow

**File:** `client/cypress/e2e/quick-request.cy.ts` or `client/tests/e2e/quick-request.spec.ts`

```typescript
describe('Quick Request Flow', () => {
  it('should request an unavailable movie successfully', () => {
    // 1. Login
    // 2. Find unavailable movie
    // 3. Click "Request Movie"
    // 4. Verify button shows "Requesting..."
    // 5. Verify success toast appears
    // 6. Verify button changes to "Requested ✓"
    // 7. Refresh page
    // 8. Verify button still shows "Requested ✓"
  })

  it('should handle request errors gracefully', () => {
    // 1. Mock API error
    // 2. Click "Request Movie"
    // 3. Verify error toast appears
    // 4. Verify button returns to "Request Movie" state
  })

  it('should prevent duplicate requests', () => {
    // 1. Request a movie
    // 2. Wait for success
    // 3. Verify button is disabled
    // 4. Verify clicking does nothing
  })

  it('should sync with server on mount', () => {
    // 1. Mock server with existing requests
    // 2. Load page
    // 3. Verify requested movies show "Requested ✓"
  })
})
```

## Manual Test Cases

### Test Case 1: Basic Quick Request

**Prerequisites:** User is logged in, server is running

**Steps:**
1. Navigate to movie library
2. Scroll to find an unavailable movie (badge shows "Coming soon")
3. Click "Request Movie" button

**Expected Results:**
- ✅ Button changes to "Requesting..." with loading spinner
- ✅ Button is disabled during request
- ✅ Success toast appears: "✓ [Movie Title] requested"
- ✅ Button changes to "Requested ✓" (light grape, disabled)
- ✅ Request appears in Request Queue section

**Pass/Fail:** _______

---

### Test Case 2: State Persistence

**Prerequisites:** Test Case 1 completed

**Steps:**
1. Note which movie was requested
2. Refresh the page (F5)
3. Find the same movie again

**Expected Results:**
- ✅ Button shows "Requested ✓" immediately
- ✅ Button is disabled
- ✅ No duplicate request possible

**Pass/Fail:** _______

---

### Test Case 3: Mobile Responsiveness

**Prerequisites:** User is logged in

**Steps:**
1. Open browser dev tools (F12)
2. Toggle device toolbar (mobile view)
3. Set viewport to iPhone 12 (390x844)
4. Find any movie card

**Expected Results:**
- ✅ Buttons stack vertically
- ✅ Buttons are full-width
- ✅ Watch button is on top
- ✅ Request/Delete button is below
- ✅ Touch targets are large enough (44px minimum)

**Pass/Fail:** _______

---

### Test Case 4: Desktop Layout

**Prerequisites:** User is logged in

**Steps:**
1. View site in desktop mode (>768px width)
2. Find any movie card

**Expected Results:**
- ✅ Buttons are in a row
- ✅ Watch button takes flex space
- ✅ Request/Delete button is on the right
- ✅ Buttons do not wrap

**Pass/Fail:** _______

---

### Test Case 5: Error Handling

**Prerequisites:** User is logged in

**Steps:**
1. Stop the backend server
2. Try to request a movie
3. Click "Request Movie"

**Expected Results:**
- ✅ Button shows "Requesting..." briefly
- ✅ Error toast appears: "⚠ Failed to fetch..."
- ✅ Button returns to "Request Movie" state (enabled)
- ✅ User can retry

**Pass/Fail:** _______

---

### Test Case 6: Server Sync on Load

**Prerequisites:** Existing requests in database

**Steps:**
1. Clear browser localStorage (Dev Tools > Application > Local Storage > Clear)
2. Refresh page
3. Check unavailable movies

**Expected Results:**
- ✅ Movies with active requests show "Requested ✓"
- ✅ Movies without requests show "Request Movie"
- ✅ Completed requests do not show as requested

**Pass/Fail:** _______

---

### Test Case 7: Toast Notifications

**Prerequisites:** User is logged in

**Steps:**
1. Request a movie
2. Observe toast notification

**Expected Results:**
- ✅ Toast appears at bottom-center
- ✅ Toast has dark background (#1A1B1E)
- ✅ Toast has success icon (green checkmark)
- ✅ Toast message includes movie title
- ✅ Toast auto-dismisses after 3 seconds
- ✅ Toast can be manually dismissed (swipe/click)

**Pass/Fail:** _______

---

### Test Case 8: Available vs Unavailable Movies

**Prerequisites:** User is logged in, library has both available and unavailable movies

**Steps:**
1. Find an available movie
2. Find an unavailable movie
3. Compare button layouts

**Expected Results for Available:**
- ✅ Shows "Watch" button (enabled, cyan)
- ✅ Shows "Delete" button (if authenticated)
- ✅ NO "Request Movie" button

**Expected Results for Unavailable:**
- ✅ Shows "Watch" button (disabled, gray, "Coming Soon")
- ✅ NO "Delete" button
- ✅ Shows "Request Movie" button (enabled, grape)

**Pass/Fail:** _______

---

## Performance Tests

### localStorage Performance

**Test:** Measure localStorage read/write times with 100+ requested movie IDs

**Acceptance Criteria:**
- Read time < 10ms
- Write time < 50ms

---

### Server Sync Performance

**Test:** Measure time to sync with server containing 50+ active requests

**Acceptance Criteria:**
- Sync completes < 1000ms
- UI remains responsive during sync

---

### Toast Notification Performance

**Test:** Request 5 movies in rapid succession

**Acceptance Criteria:**
- All toasts appear
- Toasts stack properly
- No performance degradation
- No UI jank

---

## Accessibility Tests

### Keyboard Navigation

**Steps:**
1. Use Tab to navigate to movie card
2. Press Enter on "Request Movie" button
3. Verify request triggers

**Expected:**
- ✅ Button is keyboard accessible
- ✅ Focus visible
- ✅ Enter/Space triggers action

---

### Screen Reader

**Steps:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate to movie card
3. Listen to button announcements

**Expected:**
- ✅ Button announces "Request Movie" or "Requested" state
- ✅ Loading state announced during request
- ✅ Toast messages announced

---

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

---

## Test Results Summary

**Date Tested:** ___________
**Tester:** ___________
**Browser/Device:** ___________

**Total Tests:** 8 manual + 3 categories (unit/integration/e2e)
**Passed:** ___ / 8
**Failed:** ___ / 8
**Blocked:** ___ / 8

**Critical Issues Found:**

1. ___________
2. ___________

**Minor Issues Found:**

1. ___________
2. ___________

**Notes:**

___________________________________________
___________________________________________
___________________________________________
