import { useEffect } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

type LayoutProps = PropsWithChildren<{
  header?: ReactNode
  footer?: ReactNode
}>

const scrollPositions = new Map<string, number>()

const ScrollMemory = () => {
  const { pathname, search, state } = useLocation()
  const navigationType = useNavigationType()
  const key = `${pathname}${search}`
  const isEditRoute = /^\/post\/[^/]+\/edit$/.test(pathname)
  const hasScrollOverride =
    Boolean((state as { scrollTarget?: string } | null)?.scrollTarget)

  useEffect(() => {
    if (isEditRoute) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return () => {
        scrollPositions.set(key, window.scrollY)
      }
    }

    if (hasScrollOverride) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return () => {
        scrollPositions.set(key, window.scrollY)
      }
    }

    if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return () => {
        scrollPositions.set(key, window.scrollY)
      }
    }

    const pos = scrollPositions.get(key) ?? 0
    let frame = 0
    let cancelled = false

    const restore = () => {
      if (cancelled) return
      window.scrollTo(0, pos)
      frame += 1

      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      )
      const closeEnough = Math.abs(window.scrollY - Math.min(pos, maxScroll)) <= 2

      if (closeEnough || frame >= 24) return
      requestAnimationFrame(restore)
    }

    restore()
    return () => {
      cancelled = true
      scrollPositions.set(key, window.scrollY)
    }
  }, [hasScrollOverride, isEditRoute, key, navigationType])

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
