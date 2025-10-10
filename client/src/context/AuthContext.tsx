import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login, whoami } from '../api/auth/login'
import type { LoginCredentials } from '../types'
import { useDisclosure } from '@mantine/hooks'

interface User {
  id: number
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const userData = await whoami()
      setUser(userData)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const refetchUser = async () => {
    setLoading(true)
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] = useDisclosure(false);


  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }


  const handleLogin = async (credentials: LoginCredentials) => {
    const loginResponse = await login(credentials);
    const data = await loginResponse.json();

    if (data.user) {
      context.setUser(data.user);
      closeLoginModal();
      return;
    }

    context.setUser(null);
  };


  return { handleLogin, openLoginModal, loginModalOpened, closeLoginModal, context }
}
