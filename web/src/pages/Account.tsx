import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { formatDate } from '../lib/utils'
import { pb } from '../lib/pocketbase'
import { useAuth } from '../providers/AuthProvider'

const Account = () => {
  const { user, login } = useAuth()
  const [password, setPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('未登录')
      if (!password) throw new Error('请输入新密码')
      if (!oldPassword) throw new Error('修改密码需要填写当前密码')

      await pb.collection('users').update(user.id, {
        password,
        passwordConfirm: password,
        oldPassword,
      })

      // 重新登录以刷新 token
      await login(user.email ?? '', password)

      return { message: '密码已更新' }
    },
    onSuccess: (res: any) => setFeedback(res?.message || '已更新'),
    onError: (err: any) => {
      const fieldErrors = err?.response?.data
        ? Object.entries(err.response.data)
            .map(([key, val]: any) => `${key}: ${val?.message ?? '校验失败'}`)
            .join('; ')
        : ''
      const msg = err?.response?.message || err?.message || fieldErrors || '更新失败'
      setFeedback(msg)
    },
  })

  if (!user) {
    return (
      <div className="container center">
        <div className="card">请先登录后查看资料。</div>
      </div>
    )
  }

  const createdLabel = user.created ? formatDate(user.created) : '未知'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await mutateAsync()
  }

  return (
    <div className="container auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">个人资料</p>
        <h2>{user.username ?? '未设置用户名'}</h2>
        <p className="muted">邮箱：{user.email ?? '未设置邮箱'}</p>
        <p className="muted">ID：{user.id}</p>
        <p className="muted">注册时间：{createdLabel}</p>

        <label>
          当前密码（修改密码时必填）
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="输入当前密码"
          />
        </label>
        <label>
          新密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入新密码"
          />
        </label>
        {feedback ? <div className="alert">{feedback}</div> : null}
        <button className="primary-btn" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="spin" size={16} /> : null}
          {isPending ? '保存中' : '保存修改'}
        </button>
      </form>
    </div>
  )
}

export default Account
