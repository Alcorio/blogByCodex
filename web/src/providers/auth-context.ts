import { createContext, useContext } from 'react'
import type { AuthUser } from '../types'

interface AuthContextShape {
  user: AuthUser | null
  isReady: boolean
  login: (identity: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextShape | null>(null)

const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export { AuthContext, useAuth }
export type { AuthContextShape }
