import { formatDistanceToNow } from 'date-fns'

export function formatDate(dateString: string, fallback = 'Unknown'): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return fallback
  }
}
