import { type LoginCredentials } from '../../types'

const API_URL = `${import.meta.env.VITE_PUBLIC_API_BASE_URL}`

export async function register(credentials: LoginCredentials) {
  return await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(credentials),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export async function login(credentials: LoginCredentials) {
  return await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(credentials),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export async function logout() {
  return await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export async function whoami() {
  const response = await fetch(`${API_URL}/auth/whoami`, { credentials: 'include' })
  if (!response.ok) {
    return null
  }
  return await response.json()
}

