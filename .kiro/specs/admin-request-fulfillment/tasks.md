# Implementation Plan: Admin Request Fulfillment System

## Overview

This implementation plan breaks down the admin request fulfillment system into incremental, testable steps. The approach follows a phased implementation strategy: foundation (roles and auth), core admin features (status management, comments), automation (auto-matching), and UI (admin dashboard and analytics).

Each task builds on previous work, with property-based tests integrated throughout to validate correctness early. The plan assumes the existing NestJS backend, PostgreSQL database with Kysely, and React + Mantine frontend.

## Tasks

- [ ] 1. Database schema extensions and migrations
  - Create migration to add `role` column to users table (enum: 'user', 'admin', default 'user')
  - Create migration to add fulfillment columns to requests table: `fulfilled_by`, `fulfilled_at`, `fulfilled_by_movie_id`
  - Create migration for comments table with columns: id, request_id, user_id, comment_text, created_at, updated_at
  - Create migration for audit_log table with columns: id, admin_id, request_id, action_type, old_value, new_value, metadata (jsonb), created_at
  - Add indexes: comments(request_id), audit_log(request_id), audit_log(admin_id), requests(fulfilled_by)
  - _Requirements: 1.1, 2.2, 2.3, 4.1, 10.4, 13.1, 13.2, 13.4_

- [ ] 2. Update Kysely type definitions
  - Regenerate or manually update Kysely types to include new columns and tables
  - Add TypeScript interfaces for Comment, AuditLog, and extended User/Request types
  - _Requirements: 1.1, 2.2, 4.1, 10.4_

- [ ] 3. Implement admin authorization guard
  - [ ] 3.1 Create AdminAuthGuard class implementing CanActivate
    - Extract user from request context
    - Check if user.role === 'admin'
    - Throw UnauthorizedException if not admin
    - _Requirements: 1.3, 1.4, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ]* 3.2 Write property test for admin authorization
    - **Property 2: Admin access control**
    - **Property 3: Regular user access denial**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 4. Implement AuditService
  - [ ] 4.1 Create AuditService with logAction method
    - Insert audit log entries with all required fields
    - Handle null admin_id for system actions
    - _Requirements: 2.5, 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 4.2 Add getAuditTrailForRequest method
    - Query audit logs by request_id
    - Join with users table to get admin usernames
    - Order by created_at DESC
    - _Requirements: 8.5, 10.5_
  
  - [ ] 4.3 Add getAuditTrailForAdmin method
    - Query audit logs by admin_id
    - Order by created_at DESC
    - _Requirements: 10.5_
  
  - [ ]* 4.4 Write property tests for audit service
    - **Property 41: Comprehensive audit logging**
    - **Property 42: Audit trail chronological ordering**
    - **Property 43: Audit log immutability**
    - **Validates: Requirements 2.5, 10.1, 10.2, 10.3, 10.5, 10.7**

- [ ] 5. Extend NotificationService for status changes
  - [ ] 5.1 Add notifyRequestStatusChange method
    - Get request owner user
    - Build notification message based on old/new status
    - Send notification via existing mechanism
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 5.2 Add notifyRequestFulfilled method
    - Get request owner user
    - Build fulfillment notification with movie title
    - Send notification
    - _Requirements: 3.3, 5.6_
  
  - [ ]* 5.3 Write property tests for notifications
    - **Property 9: Status change notifications**
    - **Property 10: Completion notification content**
    - **Property 11: No reverse completion notifications**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [ ] 6. Extend RequestService with admin operations
  - [ ] 6.1 Add updateStatus method
    - Validate request exists
    - Get old status
    - Update status in database
    - If status is 'completed', set fulfilled_by and fulfilled_at
    - Call AuditService.logAction
    - Call NotificationService.notifyRequestStatusChange
    - Return updated request
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 6.2 Add updatePriority method
    - Validate request exists and priority value
    - Get old priority
    - Update priority in database
    - Call AuditService.logAction
    - Return updated request
    - _Requirements: 12.2, 12.3, 12.4_
  
  - [ ]* 6.3 Write property tests for status and priority updates
    - **Property 5: Status validation**
    - **Property 6: Status persistence**
    - **Property 7: Fulfillment metadata recording**
    - **Property 8: Admin can update any request**
    - **Property 48: Priority validation**
    - **Property 49: Priority persistence**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 12.2, 12.3**

- [ ] 7. Implement request filtering and search
  - [ ] 7.1 Add getRequestsWithFilters method to RequestService
    - Build Kysely query with WHERE clauses for each filter
    - Support filtering by status, priority, user_id, fulfilled_by
    - Apply sorting (created_at, priority, status, updated_at)
    - Apply pagination (offset, limit)
    - Return paginated results with total count
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 13.6_
  
  - [ ] 7.2 Add searchRequests method to RequestService
    - Build query based on searchType (title, username, omdb_id)
    - Use ILIKE for case-insensitive partial matching (title, username)
    - Use exact match for omdb_id
    - Limit results to 100
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_
  
  - [ ]* 7.3 Write property tests for filtering and search
    - **Property 22: Comprehensive filtering**
    - **Property 23: Pagination correctness**
    - **Property 24: Sorting correctness**
    - **Property 44: Title search case-insensitive partial matching**
    - **Property 45: Username search partial matching**
    - **Property 46: OMDb ID exact search**
    - **Property 47: Search result limit**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 11.1, 11.2, 11.3, 11.4, 11.6**

- [ ] 8. Implement bulk operations
  - [ ] 8.1 Add bulkUpdateStatus method to RequestService
    - Validate requestIds length <= 100
    - For each request ID, call updateStatus
    - Catch errors for individual requests
    - Collect successes and failures
    - Return BulkOperationResult with summary
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ] 8.2 Add bulkDelete method to RequestService
    - Validate requestIds length <= 100
    - For each request ID, delete and log audit entry
    - Catch errors for individual requests
    - Collect successes and failures
    - Return BulkOperationResult with summary
    - _Requirements: 7.2, 7.3, 7.4, 7.7_
  
  - [ ]* 8.3 Write property tests for bulk operations
    - **Property 25: Bulk status update**
    - **Property 26: Bulk deletion**
    - **Property 27: Bulk operation resilience**
    - **Property 28: Bulk operation notifications**
    - **Property 29: Bulk completion metadata**
    - **Property 30: Bulk operation size limit**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement CommentService
  - [ ] 10.1 Create CommentService with createComment method
    - Validate comment text (not empty, <= 2000 chars)
    - Validate request exists
    - Insert comment into database with timestamp
    - Return created comment
    - _Requirements: 4.2, 4.3, 4.4, 14.6_
  
  - [ ] 10.2 Add getCommentsForRequest method
    - Query comments by request_id
    - Join with users table to get usernames
    - Order by created_at ASC
    - Return comments with user info
    - _Requirements: 4.5_
  
  - [ ] 10.3 Add deleteComment method
    - Get comment by ID
    - Check authorization (comment owner or admin)
    - Throw UnauthorizedException if not authorized
    - Delete comment from database
    - _Requirements: 4.6, 4.7, 4.8_
  
  - [ ]* 10.4 Write property tests for comment service
    - **Property 12: Comment text validation**
    - **Property 13: Comment persistence**
    - **Property 14: Comment chronological ordering**
    - **Property 15: Comment deletion authorization**
    - **Property 16: Comment deletion persistence**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**

- [ ] 11. Implement AutoMatcherService
  - [ ] 11.1 Create AutoMatcherService with matchUploadToRequests method
    - If movie has omdb_id, query requests with same omdb_id and status queued/processing
    - If no omdb_id, query all queued/processing requests and calculate title similarity
    - Filter requests with similarity >= 85%
    - For each matching request, update to completed with fulfillment metadata
    - Log audit entries with action_type 'auto_match'
    - Send notifications to request owners
    - Return MatchResult with matched request IDs
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ] 11.2 Implement calculateTitleSimilarity helper method
    - Normalize titles (lowercase, trim, remove special chars)
    - Implement Levenshtein distance or similar algorithm
    - Return similarity percentage (0-100)
    - _Requirements: 5.2, 5.7_
  
  - [ ]* 11.3 Write property tests for auto-matcher
    - **Property 17: OMDb ID exact matching**
    - **Property 18: Fuzzy title matching threshold**
    - **Property 19: Auto-match completion**
    - **Property 20: Multiple request matching**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

- [ ] 12. Integrate auto-matcher with upload workflow
  - Hook AutoMatcherService.matchUploadToRequests into existing movie upload completion
  - Call after movie is successfully uploaded and transcoded
  - Log match results
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 13. Implement StorageAnalyticsService
  - [ ] 13.1 Create StorageAnalyticsService with getStorageMetrics method
    - Query all movies with file sizes from database
    - Calculate total storage (sum of file sizes)
    - Calculate average file size
    - Sort by size descending and take top 10
    - Get available disk space from system (use node fs.statfs or similar)
    - Calculate usage percentage
    - Check if usage > 90% for warning flag
    - Format all byte values to human-readable format
    - Return StorageMetrics object
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ] 13.2 Add getMovieStorageDetails method
    - Query all movies with file sizes
    - Sort by size descending
    - Format byte values
    - Return MovieStorageDetail array
    - _Requirements: 9.2, 9.3_
  
  - [ ] 13.3 Implement formatBytes helper method
    - Convert bytes to GB, MB, or KB based on size
    - Use appropriate precision (2 decimal places)
    - _Requirements: 9.6_
  
  - [ ]* 13.4 Write property tests for storage analytics
    - **Property 35: Total storage calculation**
    - **Property 36: Per-movie storage display**
    - **Property 37: Storage sorting**
    - **Property 38: Top N largest files**
    - **Property 39: Average file size calculation**
    - **Property 40: Storage format conversion**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
  
  - [ ]* 13.5 Write unit test for storage warning threshold
    - Test that warning flag is set when usage > 90%
    - _Requirements: 9.7_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create AdminController with request management endpoints
  - [ ] 15.1 Add GET /api/admin/requests endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Accept query params for filters and pagination
    - Call RequestService.getRequestsWithFilters
    - Return paginated results
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ] 15.2 Add GET /api/admin/requests/:id endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Call RequestService.findById
    - Include fulfillment metadata if completed
    - Return request details
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 15.3 Add PATCH /api/admin/requests/:id/status endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Validate request body (status field)
    - Call RequestService.updateStatus
    - Return updated request
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 15.4 Add PATCH /api/admin/requests/:id/priority endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Validate request body (priority field)
    - Call RequestService.updatePriority
    - Return updated request
    - _Requirements: 12.2, 12.3, 12.4_
  
  - [ ] 15.5 Add POST /api/admin/requests/bulk-update endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Validate request body (requestIds array, status)
    - Call RequestService.bulkUpdateStatus
    - Return BulkOperationResult
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ] 15.6 Add DELETE /api/admin/requests/bulk-delete endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Validate request body (requestIds array)
    - Call RequestService.bulkDelete
    - Return BulkOperationResult
    - _Requirements: 7.2, 7.3, 7.4, 7.7_
  
  - [ ] 15.7 Add GET /api/admin/requests/search endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Accept query params (searchTerm, searchType)
    - Call RequestService.searchRequests
    - Return matching requests
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_

- [ ] 16. Create CommentController with comment endpoints
  - [ ] 16.1 Add GET /api/requests/:id/comments endpoint
    - Authenticate user (regular auth, not admin-only)
    - Call CommentService.getCommentsForRequest
    - Return comments array
    - _Requirements: 4.5, 8.4_
  
  - [ ] 16.2 Add POST /api/requests/:id/comments endpoint
    - Authenticate user
    - Validate request body (comment_text)
    - Call CommentService.createComment with user ID from auth context
    - Return created comment
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ] 16.3 Add DELETE /api/comments/:id endpoint
    - Authenticate user
    - Call CommentService.deleteComment with user ID and isAdmin flag
    - Return success response
    - _Requirements: 4.6, 4.7, 4.8_

- [ ] 17. Add storage analytics and audit endpoints to AdminController
  - [ ] 17.1 Add GET /api/admin/storage/metrics endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Call StorageAnalyticsService.getStorageMetrics
    - Return StorageMetrics
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ] 17.2 Add GET /api/admin/storage/details endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Call StorageAnalyticsService.getMovieStorageDetails
    - Return MovieStorageDetail array
    - _Requirements: 9.2, 9.3_
  
  - [ ] 17.3 Add GET /api/admin/audit/request/:id endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Call AuditService.getAuditTrailForRequest
    - Return audit log entries
    - _Requirements: 8.5, 10.5_
  
  - [ ] 17.4 Add GET /api/admin/audit/admin/:id endpoint
    - Apply @UseGuards(AdminAuthGuard)
    - Call AuditService.getAuditTrailForAdmin
    - Return audit log entries
    - _Requirements: 10.5_

- [ ] 18. Add request validation DTOs
  - Create DTOs with class-validator decorators for all endpoints
  - UpdateStatusDto: validate status enum
  - UpdatePriorityDto: validate priority enum
  - BulkUpdateDto: validate requestIds array length <= 100
  - CreateCommentDto: validate comment_text length
  - SearchRequestsDto: validate searchType enum
  - _Requirements: 2.1, 4.2, 4.3, 7.7, 12.2, 14.1, 14.2, 14.3, 14.7_

- [ ]* 19. Write integration tests for API endpoints
  - Test admin authorization on all admin endpoints
  - Test request validation on all endpoints
  - Test error responses (400, 403, 404)
  - Test end-to-end workflows (create request → update status → add comment → complete)
  - _Requirements: 1.3, 1.4, 2.7, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 20. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Create AdminDashboard React component
  - [ ] 21.1 Create AdminDashboard component with Mantine Table
    - Fetch requests from GET /api/admin/requests
    - Display columns: title, user, status, priority, creation date
    - Add filter controls (status, priority, user dropdowns)
    - Add search bar with search type selector
    - Add pagination controls
    - Add sort controls for each column
    - Add checkbox column for bulk selection
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 11.1, 11.2, 11.3_
  
  - [ ] 21.2 Add bulk action buttons
    - Add "Update Status" button with status dropdown
    - Add "Delete Selected" button with confirmation modal
    - Call POST /api/admin/requests/bulk-update or DELETE /api/admin/requests/bulk-delete
    - Display success/failure summary in notification
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 21.3 Add admin route protection
    - Check user role in auth context
    - Redirect to home if not admin
    - Show "Access Denied" message
    - _Requirements: 1.3, 1.4, 15.2_

- [ ] 22. Create RequestDetailView React component
  - [ ] 22.1 Create RequestDetailView component
    - Fetch request details from GET /api/admin/requests/:id
    - Display all request fields (title, user, status, priority, notes, OMDb ID, dates)
    - Display fulfillment metadata if completed (admin username, timestamp, movie title)
    - Add status update dropdown (admin only)
    - Add priority update dropdown (admin only)
    - _Requirements: 8.1, 8.2, 8.3, 13.5, 13.7_
  
  - [ ] 22.2 Add CommentThread sub-component
    - Fetch comments from GET /api/requests/:id/comments
    - Display comments with username and timestamp
    - Add comment input form
    - Call POST /api/requests/:id/comments on submit
    - Add delete button for own comments (or all if admin)
    - Call DELETE /api/comments/:id on delete
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 8.4_
  
  - [ ] 22.3 Add AuditTrail sub-component
    - Fetch audit trail from GET /api/admin/audit/request/:id
    - Display audit entries with admin username, action, old/new values, timestamp
    - Order by timestamp descending
    - _Requirements: 8.5, 10.5_

- [ ] 23. Create StorageAnalytics React component
  - [ ] 23.1 Create StorageAnalytics component
    - Fetch metrics from GET /api/admin/storage/metrics
    - Display total storage, average file size, usage percentage
    - Show warning badge if usage > 90%
    - Display top 10 largest files in table
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ] 23.2 Add detailed storage table
    - Fetch details from GET /api/admin/storage/details
    - Display all movies with title, size, path
    - Sort by size descending
    - Add search/filter capabilities
    - _Requirements: 9.2, 9.3_

- [ ] 24. Add admin navigation and routing
  - Add "Admin" menu item to main navigation (visible only to admins)
  - Add routes for /admin/dashboard, /admin/requests/:id, /admin/storage
  - Protect all admin routes with role check
  - _Requirements: 1.3, 1.4_

- [ ] 25. Add notification toast integration
  - Integrate status change notifications with existing toast system
  - Display notifications when request status changes
  - Display notifications when requests are auto-matched
  - Include movie title and timestamp in completion notifications
  - _Requirements: 3.1, 3.2, 3.3, 5.6_

- [ ] 26. Final checkpoint - End-to-end testing
  - Test complete request fulfillment workflow from user request to admin completion
  - Test auto-matching when movie is uploaded
  - Test bulk operations with multiple requests
  - Test comment thread with multiple users
  - Test storage analytics with various file sizes
  - Verify all notifications are delivered correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests verify end-to-end workflows and component interactions
- The implementation follows a backend-first approach, then adds frontend UI
- Auto-matching is integrated after core admin features are stable
- All admin endpoints are protected with AdminAuthGuard
- All operations are audited for accountability
