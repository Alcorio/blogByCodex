import { useMutation } from '@tanstack/react-query'
import { LogIn } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const redirectTo = params.get('redirect') ?? '/'

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async () => {
      await login(email, password)
      navigate(redirectTo)
    },
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await mutateAsync()
  }

  return (
    <div className="container auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">欢迎回来</p>
          <h2>登录后台</h2>
        </div>
        <label>
          邮箱
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </label>
        {error ? <p className="error">登录失败：{(error as Error).message}</p> : null}
        <button className="primary-btn" type="submit" disabled={isPending}>
          <LogIn size={18} />
          {isPending ? '登录中...' : '进入控制台'}
        </button>
        <p className="muted">
          没有账号？<Link to="/signup">去注册</Link>
        </p>
      </form>
    </div>
  )
}

export default Login
