import type { PropsWithChildren } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { pb } from '../lib/pocketbase'
import type { AuthUser } from '../types'
import { AuthContext, type AuthContextShape } from './auth-context'

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(
    (pb.authStore.model as AuthUser) ?? null,
  )

  useEffect(() => {
    const remove = pb.authStore.onChange(() => {
      setUser((pb.authStore.model as AuthUser) ?? null)
    })
    return remove
  }, [])

  const value = useMemo<AuthContextShape>(
    () => ({
      user,
      isReady: true,
      login: async (identity: string, password: string) => {
        await pb.collection('users').authWithPassword(identity, password)
        setUser((pb.authStore.model as AuthUser) ?? null)
      },
      logout: () => {
        pb.authStore.clear()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
