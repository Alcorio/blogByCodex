import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { pb } from '../lib/pocketbase'
import type { AuthUser } from '../types'

interface AuthContextShape {
  user: AuthUser | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextShape | null>(null)

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(
    (pb.authStore.model as AuthUser) ?? null,
  )
  const [isReady, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    const remove = pb.authStore.onChange(() => {
      setUser((pb.authStore.model as AuthUser) ?? null)
    })
    return remove
  }, [])

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      isReady,
      login: async (email: string, password: string) => {
        await pb.collection('users').authWithPassword(email, password)
        setUser((pb.authStore.model as AuthUser) ?? null)
      },
      logout: () => {
        pb.authStore.clear()
        setUser(null)
      },
    }),
    [isReady, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
