import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login, register as registerAPI, logout as logoutAPI, whoami } from '../api/auth/login'
import type { LoginCredentials } from '../types'
import { useDisclosure } from '@mantine/hooks'

type Role = 'user' | 'admin'

interface User {
  id: string
  name: string
  role: Role
}

interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  refetchUser: () => Promise<void>
  isAdmin: boolean
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

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refetchUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] = useDisclosure(false);
  const [registerModalOpened, { open: openRegisterModal, close: closeRegisterModal }] = useDisclosure(false);


  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }


  const handleLogin = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const loginResponse = await login(credentials);

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        context.setUser(null);
        return { success: false, error: errorData.message || 'Invalid credentials' };
      }

      const data = await loginResponse.json();

      if (data.user) {
        context.setUser(data.user);
        closeLoginModal();
        return { success: true };
      }

      context.setUser(null);
      return { success: false, error: 'Login failed' };
    } catch {
      context.setUser(null);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const handleRegister = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const registerResponse = await registerAPI(credentials);

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Registration failed' };
      }

      const data = await registerResponse.json();

      if (data.user) {
        context.setUser(data.user);
        closeRegisterModal();
        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAPI();
      context.setUser(null);
    } catch {
      // Even if logout fails, clear local user state
      context.setUser(null);
    }
  };

  const switchToRegister = () => {
    closeLoginModal();
    openRegisterModal();
  };

  const switchToLogin = () => {
    closeRegisterModal();
    openLoginModal();
  };


  return {
    handleLogin,
    handleRegister,
    handleLogout,
    openLoginModal,
    loginModalOpened,
    closeLoginModal,
    openRegisterModal,
    registerModalOpened,
    closeRegisterModal,
    switchToRegister,
    switchToLogin,
    context
  }
}
