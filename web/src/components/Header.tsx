import { LogIn, LogOut, PenSquare, ChevronDown } from 'lucide-react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { getFileUrl } from '../lib/pocketbase'

const Header = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  return (
    <header className="app-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">Pulse</span>
          <span className="brand-sub">Blog Studio</span>
        </Link>
        <nav className="nav">
          <Link className={pathname === '/' ? 'nav-link active' : 'nav-link'} to="/">
            首页
          </Link>
          <Link
            className={
              pathname === '/posts' || pathname.startsWith('/post')
                ? 'nav-link active'
                : 'nav-link'
            }
            to="/posts"
          >
            文章
          </Link>
          <Link
            className={pathname === '/dashboard' ? 'nav-link active' : 'nav-link'}
            to="/dashboard"
          >
            控制台
          </Link>
          <Link
            className={pathname === '/my-posts' ? 'nav-link active' : 'nav-link'}
            to="/my-posts"
          >
            我的文章
          </Link>
        </nav>
        <div className="nav-actions">
          <button
            className="ghost-btn"
            type="button"
            onClick={() => navigate('/dashboard')}
          >
            <PenSquare size={18} />
            写作
          </button>
          {user ? (
            <>
              <div
                className="avatar-menu"
                onClick={() => setOpen((v) => !v)}
                ref={menuRef}
              >
                <div className="avatar">
                  {user.profileAvatar || user.avatar ? (
                    <img
                      src={getFileUrl(user, user.profileAvatar || user.avatar, '64x64')}
                      alt="avatar"
                      className="avatar-img"
                    />
                  ) : (
                    <span>{(user.username ?? user.email ?? '访客').slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="username">{user.username ?? user.email ?? '用户'}</span>
                <ChevronDown size={16} />
                {open ? (
                  <div className="avatar-dropdown">
                    <Link to="/profile">上传头像</Link>
                    <Link to="/account">个人资料</Link>
                  </div>
                ) : null}
              </div>
              <button className="ghost-btn" type="button" onClick={handleLogout}>
                <LogOut size={18} />
                退出
              </button>
            </>
          ) : (
            <>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => navigate('/signup')}
              >
                注册
              </button>
              <button
                className="primary-btn"
                type="button"
                onClick={() => navigate('/login')}
              >
                <LogIn size={18} />
                登录
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
