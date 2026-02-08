const API_URL = `${import.meta.env.VITE_PUBLIC_API_BASE_URL}/admin`

export interface AdminRequestFilters {
  status?: string[]
  priority?: string[]
  userId?: string
  fulfilledBy?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: 'date_requested' | 'priority' | 'status' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface MovieRequestWithUser {
  id: string
  omdb_id: string | null
  title: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'queued' | 'processing' | 'completed'
  notes: string | null
  date_requested: string
  date_completed: string | null
  requested_by: string
  fulfilled_by: string | null
  fulfilled_at: string | null
  fulfilled_movie_id: string | null
  requester_name: string
  fulfilled_by_name: string | null
}

export interface BulkOperationResult {
  total: number
  successful: number
  failed: number
  results: Array<{ id: string; success: boolean; error?: string }>
}

export interface DashboardStats {
  totalRequests: number
  statusCounts: {
    queued: number
    processing: number
    completed: number
  }
  priorityCounts: {
    low: number
    medium: number
    high: number
  }
}

export interface AuditLog {
  id: string
  admin_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  admin_username: string | null
}

export interface UserWithRole {
  id: string
  name: string
  date_created: string
  role: 'user' | 'admin'
}

// ==================== Request Management ====================

export async function getAdminRequests(
  filters: AdminRequestFilters = {}
): Promise<PaginatedResult<MovieRequestWithUser>> {
  const params = new URLSearchParams()

  if (filters.status) {
    filters.status.forEach(s => params.append('status', s))
  }
  if (filters.priority) {
    filters.priority.forEach(p => params.append('priority', p))
  }
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.fulfilledBy) params.set('fulfilledBy', filters.fulfilledBy)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', filters.page.toString())
  if (filters.limit) params.set('limit', filters.limit.toString())
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const response = await fetch(`${API_URL}/requests?${params}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch requests')
  }

  return response.json()
}

export async function getAdminRequest(id: string): Promise<MovieRequestWithUser> {
  const response = await fetch(`${API_URL}/requests/${id}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch request')
  }

  return response.json()
}

export async function updateAdminRequest(
  id: string,
  data: { status?: string; priority?: string }
): Promise<MovieRequestWithUser> {
  const response = await fetch(`${API_URL}/requests/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update request')
  }

  return response.json()
}

export async function deleteAdminRequest(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/requests/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to delete request')
  }

  return response.json()
}

// ==================== Bulk Operations ====================

export async function bulkUpdateStatus(
  ids: string[],
  status: string
): Promise<BulkOperationResult> {
  const response = await fetch(`${API_URL}/requests/bulk-status`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status }),
  })

  if (!response.ok) {
    throw new Error('Failed to bulk update status')
  }

  return response.json()
}

export async function bulkUpdatePriority(
  ids: string[],
  priority: string
): Promise<BulkOperationResult> {
  const response = await fetch(`${API_URL}/requests/bulk-priority`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, priority }),
  })

  if (!response.ok) {
    throw new Error('Failed to bulk update priority')
  }

  return response.json()
}

export async function bulkDeleteRequests(ids: string[]): Promise<BulkOperationResult> {
  const response = await fetch(`${API_URL}/requests/bulk`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })

  if (!response.ok) {
    throw new Error('Failed to bulk delete')
  }

  return response.json()
}

// ==================== Manual Matching ====================

export async function manualMatchRequest(
  requestId: string,
  movieId: string
): Promise<MovieRequestWithUser> {
  const response = await fetch(`${API_URL}/requests/${requestId}/match`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movieId }),
  })

  if (!response.ok) {
    throw new Error('Failed to match request')
  }

  return response.json()
}

// ==================== Search ====================

export async function searchRequests(
  term: string,
  type: 'title' | 'username' | 'omdb_id' = 'title'
): Promise<MovieRequestWithUser[]> {
  const params = new URLSearchParams({ term, type })
  const response = await fetch(`${API_URL}/requests/search?${params}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to search requests')
  }

  return response.json()
}

// ==================== Dashboard Stats ====================

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/dashboard/stats`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }

  return response.json()
}

// ==================== Audit Trail ====================

export async function getAuditLogs(limit?: number): Promise<AuditLog[]> {
  const params = limit ? `?limit=${limit}` : ''
  const response = await fetch(`${API_URL}/audit${params}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch audit logs')
  }

  return response.json()
}

export async function getRequestAuditTrail(requestId: string): Promise<AuditLog[]> {
  const response = await fetch(`${API_URL}/audit/request/${requestId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch audit trail')
  }

  return response.json()
}

// ==================== User Management ====================

export async function getUsers(): Promise<UserWithRole[]> {
  const response = await fetch(`${API_URL}/users`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}

export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin'
): Promise<UserWithRole> {
  const response = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })

  if (!response.ok) {
    throw new Error('Failed to update user role')
  }

  return response.json()
}
