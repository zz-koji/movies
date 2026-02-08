const API_URL = `${import.meta.env.VITE_PUBLIC_API_BASE_URL}`

export interface Comment {
  id: string
  request_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  username: string
}

export async function getComments(requestId: string): Promise<Comment[]> {
  const response = await fetch(`${API_URL}/requests/${requestId}/comments`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch comments')
  }

  return response.json()
}

export async function addComment(
  requestId: string,
  content: string
): Promise<Comment> {
  const response = await fetch(`${API_URL}/requests/${requestId}/comments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    throw new Error('Failed to add comment')
  }

  return response.json()
}

export async function deleteComment(commentId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/comments/${commentId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to delete comment')
  }

  return response.json()
}
