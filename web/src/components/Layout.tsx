import { useEffect } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

type LayoutProps = PropsWithChildren<{
  header?: ReactNode
  footer?: ReactNode
}>

const scrollPositions = new Map<string, number>()

const ScrollMemory = () => {
  const { pathname, search } = useLocation()
  const key = `${pathname}${search}`

  useEffect(() => {
    const pos = scrollPositions.get(key) ?? 0
    window.scrollTo(0, pos)
    return () => {
      scrollPositions.set(key, window.scrollY)
    }
  }, [key])

  return null
}

const Layout = ({ header, footer, children }: LayoutProps) => {
  return (
    <div className="app-shell">
      {header}
      <main className="app-content">
        <ScrollMemory />
        {children}
      </main>
      {footer}
    </div>
  )
}

export default Layout
