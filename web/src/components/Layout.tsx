import type { PropsWithChildren, ReactNode } from 'react'

type LayoutProps = PropsWithChildren<{
  header?: ReactNode
  footer?: ReactNode
}>

const Layout = ({ header, footer, children }: LayoutProps) => {
  return (
    <div className="app-shell">
      {header}
      <main className="app-content">{children}</main>
      {footer}
    </div>
  )
}

export default Layout
