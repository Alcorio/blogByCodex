import { useMutation } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { getFileUrl, pb } from '../lib/pocketbase'
import { useAuth } from '../providers/AuthProvider'

const Profile = () => {
  const { user } = useAuth()
  const [file, setFile] = useState<FileList | null>(null)

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async () => {
      if (!user?.id || !file?.length) throw new Error('请选择头像文件')
      const fd = new FormData()
      fd.append('profileAvatar', file[0])
      const res = await pb.collection('users').update(user.id, fd)
      // 更新本地状态
      pb.authStore.save(pb.authStore.token, res)
      return res
    },
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await mutateAsync()
  }

  if (!user) {
    return (
      <div className="container center">
        <div className="card">请先登录。</div>
      </div>
    )
  }

  return (
    <div className="container auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">个人资料</p>
          <h2>上传头像</h2>
        </div>
        <div className="avatar large">
          {user.profileAvatar || user.avatar ? (
            <img
              src={getFileUrl(user, user.profileAvatar || user.avatar, '256x256')}
              alt="avatar"
              className="avatar-img"
            />
          ) : (
            <span>{(user.username ?? user.email ?? 'U').slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files)} />
        {error ? <p className="error">{(error as Error).message}</p> : null}
        <button className="primary-btn" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}
          {isPending ? '上传中...' : '保存头像'}
        </button>
      </form>
    </div>
  )
}

export default Profile
