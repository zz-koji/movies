const API_URL = `${import.meta.env.VITE_PUBLIC_API_BASE_URL}/notifications`

export interface Notification {
  id: string
  user_id: string
  type: 'request_status_changed' | 'request_matched' | 'comment_added' | 'role_changed'
  title: string
  message: string
  reference_type: string | null
  reference_id: string | null
  read_at: string | null
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  const response = await fetch(API_URL, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch notifications')
  }

  return response.json()
}

export async function getUnreadNotifications(): Promise<Notification[]> {
  const response = await fetch(`${API_URL}/unread`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch unread notifications')
  }

  return response.json()
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const response = await fetch(`${API_URL}/unread/count`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch unread count')
  }

  return response.json()
}

export async function markAsRead(notificationId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/${notificationId}/read`, {
    method: 'PATCH',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to mark notification as read')
  }

  return response.json()
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/read-all`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read')
  }

  return response.json()
}
