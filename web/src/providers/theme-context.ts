import { createContext, useContext } from 'react'

type ThemeMode = 'light' | 'dark'

interface ThemeContextShape {
  theme: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextShape | null>(null)

const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}

export { ThemeContext, useTheme }
export type { ThemeContextShape, ThemeMode }
