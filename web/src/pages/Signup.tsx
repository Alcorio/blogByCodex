import { useMutation } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { useAuth } from '../providers/AuthProvider'

const Signup = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async () => {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        username: username || email.split('@')[0],
      })
      await login(email, password)
      navigate('/')
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
          <p className="eyebrow">新建账号</p>
          <h2>注册</h2>
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
          昵称（可选）
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="昵称"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="至少8位"
          />
        </label>
        {error ? <p className="error">注册失败：{(error as Error).message}</p> : null}
        <button className="primary-btn" type="submit" disabled={isPending}>
          <UserPlus size={18} />
          {isPending ? '提交中...' : '创建账号'}
        </button>
      </form>
    </div>
  )
}

export default Signup
