import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchPostBySlug, fetchTags, updatePost } from '../api/posts'
import { getFileUrl, pb } from '../lib/pocketbase'
import { localOffsetString, nowLocalInput, toIsoWithOffset } from '../lib/utils'
import { useAuth } from '../providers/AuthProvider'
import type { PostFormInput } from '../types'

const EditPost = () => {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const form = useForm<PostFormInput>()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [attachmentLinks, setAttachmentLinks] = useState<
    { name: string; url: string; imgTag: string; thumb?: string }[]
  >([])
  const [showAttachments, setShowAttachments] = useState(true)
  const [isRemoving, setIsRemoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [publishedTz, setPublishedTz] = useState(localOffsetString())
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const attachmentsInputRef = useRef<HTMLInputElement | null>(null)
  const contentRegister = form.register('content', { required: true })
  const attachmentsRegister = form.register('attachments')

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  })

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['post-edit', slug],
    queryFn: () => fetchPostBySlug(slug || ''),
    enabled: Boolean(slug),
  })

  useEffect(() => {
    if (post) {
      const tz = post.publishedTz || localOffsetString()
      form.reset({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        content: post.content,
        status: post.status,
        tags: post.tags ?? [],
        publishedAt: nowLocalInput(tz),
        publishedTz: tz,
        readingMinutes: post.readingMinutes ?? 3,
        cover: null,
        attachments: null,
        showAttachments: Boolean(post.showAttachments),
      })
      setPublishedTz(tz)
      setShowAttachments(Boolean(post.showAttachments))
      if (post.cover) setCoverPreview(getFileUrl(post, post.cover, '640x360'))
      if (post.attachments?.length) {
        setAttachmentLinks(
          post.attachments.map((file: string) => {
            const url = getFileUrl(post, file)
            return {
              name: file,
              url,
              imgTag: `<img src="${url}" alt="${post.title || ''}" />`,
              thumb: getFileUrl(post, file, '320x'),
            }
          }),
        )
      }
    }
  }, [form, post])

  const buildErrorText = (err: unknown) => {
    const e = err as { message?: string; response?: { message?: string } }
    return e?.message || e?.response?.message || '保存失败，请稍后再试'
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: PostFormInput) => {
      if (!post) throw new Error('未找到文章')
      return updatePost(post.id, {
        ...values,
        readingMinutes: values.readingMinutes ? Number(values.readingMinutes) : undefined,
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts-page'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', slug] })
      setFeedback({ type: 'success', text: '已更新' })
      navigate(`/post/${res.slug}`)
    },
    onError: (err: unknown) => {
      const msg = buildErrorText(err)
      setFeedback({ type: 'error', text: msg })
    },
  })

  const backTo = (location.state as { backTo?: string } | undefined)?.backTo || '/posts'

  const { mutateAsync: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error('未找到文章')
      return pb.collection('posts').delete(post.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts-page'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', slug] })
      queryClient.invalidateQueries({ queryKey: ['post-edit', slug] })
      navigate(backTo || '/dashboard')
      window.scrollTo({ top: 0, behavior: 'instant' })
    },
    onError: (err: unknown) => {
      const msg = buildErrorText(err) || '删除失败，请稍后再试'
      setFeedback({ type: 'error', text: msg })
    },
  })

  const coverField = form.watch('cover')
  useEffect(() => {
    if (coverField && coverField[0]) {
      if (coverField[0].size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', text: '封面大小不能超过 5MB' })
        return
      }
      setCoverPreview(URL.createObjectURL(coverField[0]))
      if (post?.id) {
        const fd = new FormData()
        fd.append('cover', coverField[0])
        pb.collection('posts')
          .update(post.id, fd)
          .then((res) => {
            setCoverPreview(getFileUrl(res, res.cover, '640x360'))
            setFeedback({ type: 'success', text: '封面已上传，可直接使用。' })
          })
          .catch((err: unknown) =>
            setFeedback({ type: 'error', text: buildErrorText(err) || '封面上传失败' }),
          )
      }
    }
  }, [coverField, post?.id])

  const attachmentsField = form.watch('attachments')
  useEffect(() => {
    if (!attachmentsField || !attachmentsField.length || !post?.id) return

    const files = Array.from(attachmentsField)
    const maxSize = 8 * 1024 * 1024
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    const oversize = files.find((f) => f.size > maxSize)
    if (oversize) {
      setFeedback({ type: 'error', text: '插图单个文件不能超过 8MB' })
      return
    }
    const invalidType = files.find((f) => !allowedTypes.includes(f.type))
    if (invalidType) {
      setFeedback({ type: 'error', text: '仅支持 jpg、png、webp、gif 图片格式' })
      return
    }

    const fd = new FormData()
    // keep already uploaded attachments based on current list, not the initial post snapshot
    attachmentLinks.forEach((item) => fd.append('attachments', item.name))
    files.forEach((file) => fd.append('attachments', file))

    pb.collection('posts')
      .update(post.id, fd)
      .then((res) => {
        setAttachmentLinks(
          res.attachments?.map((file: string) => {
            const url = getFileUrl(res, file)
            return {
              name: file,
              url,
              imgTag: `<img src="${url}" alt="${res.title || ''}" />`,
              thumb: getFileUrl(res, file, '320x'),
            }
          }) ?? [],
        )
        setFeedback({ type: 'success', text: '插图已上传，可复制引用链接' })
        // Reset field to avoid resubmitting the same FileList on form submit
        form.resetField('attachments')
        if (attachmentsInputRef.current) {
          attachmentsInputRef.current.value = ''
        }
      })
      .catch((err: unknown) =>
        setFeedback({ type: 'error', text: buildErrorText(err) || '插图上传失败' }),
      )
  }, [attachmentLinks, attachmentsField, form, post?.id])

  const handleCopy = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const tmp = document.createElement('textarea')
        tmp.value = text
        document.body.appendChild(tmp)
        tmp.select()
        document.execCommand('copy')
        document.body.removeChild(tmp)
      }
      setFeedback({ type: 'success', text: '已复制到剪贴板' })
    } catch (err: unknown) {
      const msg = buildErrorText(err) || '复制失败，请手动复制'
      setFeedback({ type: 'error', text: msg })
    }
  }

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const applyMarkup = (wrapStart: string, wrapEnd: string) => {
    const el = contentRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = form.getValues('content') || ''
    const before = value.slice(0, start)
    const selected = value.slice(start, end)
    const after = value.slice(end)
    form.setValue('content', `${before}${wrapStart}${selected || ''}${wrapEnd}${after}`)
  }

  const insertImage = () => {
    const url = prompt('图片地址')
    if (!url) return
    const width = prompt('可选：宽度（px），留空自适应') || ''
    const style = width
      ? ` style="width:${width}px;max-width:100%;height:auto;"`
      : ' style="max-width:100%;height:auto;"'
    const imgTag = `<img src="${url}"${style} />`
    const value = form.getValues('content') || ''
    form.setValue('content', `${value}\n${imgTag}`)
  }

  const onSubmit = async (values: PostFormInput) => {
    if (!post) return
    const iso = toIsoWithOffset(values.publishedAt || nowLocalInput(publishedTz), publishedTz)
    await mutateAsync({
      ...values,
      slug: post.slug,
      showAttachments,
      publishedAt: iso,
      publishedTz,
    })
  }

  const handleRemoveAttachment = async (name: string) => {
    if (!post?.id) return
    setIsRemoving(true)
    const keep = attachmentLinks.filter((item) => item.name !== name).map((item) => item.name)
    const fd = new FormData()
    if (keep.length) {
      keep.forEach((n) => fd.append('attachments', n))
    } else {
      // Explicitly clear file field when no attachments remain
      fd.append('attachments', '')
    }
    try {
      const res = await pb.collection('posts').update(post.id, fd)
      setAttachmentLinks(
        res.attachments?.map((file: string) => {
          const url = getFileUrl(res, file)
          return {
            name: file,
            url,
            imgTag: `<img src="${url}" alt="${res.title || ''}" />`,
            thumb: getFileUrl(res, file, '320x'),
          }
        }) ?? [],
      )
      setFeedback({ type: 'success', text: '已删除附件' })
    } catch (err: unknown) {
      setFeedback({ type: 'error', text: buildErrorText(err) || '删除失败' })
    } finally {
      setIsRemoving(false)
    }
  }

  if (!user) {
    return (
      <div className="container center">
        <div className="card">请先登录后再编辑文章。</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container center">
        <Loader2 className="spin" />
      </div>
    )
  }

  if (!post || error) {
    return (
      <div className="container center">
        <div className="card">未找到文章或无权限。</div>
      </div>
    )
  }

  if (post.author !== user.id) {
    return (
      <div className="container center">
        <div className="card">仅作者可编辑此文章。</div>
      </div>
    )
  }

  return (
    <section className="container dashboard" id="dashboard">
      {feedback ? (
        <div className={`toast ${feedback.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {feedback.text}
        </div>
      ) : null}
      <div className="section-title">
        <div>
          <p className="eyebrow">编辑</p>
          <h2>{post.title}</h2>
          <p className="muted">修改内容或封面、插图、标签。</p>
        </div>
        {feedback?.type === 'success' ? <span className="pill success">已更新</span> : null}
      </div>

      <form className="card form-grid" onSubmit={form.handleSubmit(onSubmit)}>
        <label>
          标题
          <input placeholder="标题" {...form.register('title', { required: '标题必填' })} />
        </label>
        <label>
          Slug
          <input
            placeholder="url-slug"
            {...form.register('slug')}
            readOnly
            aria-readonly="true"
            title="slug 创建后不可修改"
          />
        </label>
        <label className="full">
          摘要
          <textarea rows={3} {...form.register('excerpt')} />
        </label>
        <label className="full">
          正文 (支持 HTML)
          <div className="editor-toolbar">
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<strong>', '</strong>')}>
              加粗
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<em>', '</em>')}>
              斜体
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<u>', '</u>')}>
              下划线
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<h2>', '</h2>')}>
              H2
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<h3>', '</h3>')}>
              H3
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<blockquote>', '</blockquote>')}>
              引用
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<span style="font-size:18px;">', '</span>')}>
              大号字
            </button>
            <button type="button" className="ghost-btn" onClick={() => applyMarkup('<span style="font-size:12px;">', '</span>')}>
              小号字
            </button>
            <button type="button" className="ghost-btn" onClick={insertImage}>
              插入图片
            </button>
          </div>
          <textarea
            rows={10}
            {...contentRegister}
            ref={(el) => {
              contentRef.current = el
              contentRegister.ref(el)
            }}
          />
        </label>
        <label>
          状态
          <select {...form.register('status')}>
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="archived">归档</option>
          </select>
        </label>
        <label>
          发布时间
          <div className="time-row">
            <input
              type="datetime-local"
              {...form.register('publishedAt')}
              defaultValue={nowLocalInput(publishedTz)}
            />
            <select
              value={publishedTz}
              onChange={(e) => {
                setPublishedTz(e.target.value)
                form.setValue('publishedTz', e.target.value)
                form.setValue('publishedAt', nowLocalInput(e.target.value))
              }}
            >
              {['-12:00','-09:00','-05:00','-03:00','-02:00','00:00','+01:00','+02:00','+03:00','+05:30','+07:00','+08:00','+09:00','+10:00','+12:00','+13:00'].map((tz) => (
                <option key={tz} value={tz}>
                  UTC{tz}
                </option>
              ))}
            </select>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => form.setValue('publishedAt', nowLocalInput(publishedTz))}
            >
              当前时间
            </button>
          </div>
        </label>
        <label>
          阅读时长(分钟)
          <input type="number" min={1} max={60} {...form.register('readingMinutes')} />
        </label>
        <label>
          封面
          <input type="file" accept="image/*" {...form.register('cover')} />
          <p className="muted">建议 16:9，最大 5MB。</p>
          {coverPreview ? (
            <div className="cover-preview">
              <img src={coverPreview} alt="cover preview" />
            </div>
          ) : null}
        </label>
        <label className="full">
          插图（可多选）
          <input
            type="file"
            accept="image/*"
            multiple
            {...attachmentsRegister}
            ref={(el) => {
              attachmentsRegister.ref(el)
              attachmentsInputRef.current = el
            }}
          />
          <p className="muted">
            单个不超过 8MB。上传后下方可复制 URL 或 &lt;img&gt; 标签，直接粘贴到正文。
          </p>
          <label className="pill checkbox">
            <input
              type="checkbox"
              checked={showAttachments}
              onChange={(e) => {
                setShowAttachments(e.target.checked)
                form.setValue('showAttachments', e.target.checked)
              }}
            />
            在正文下方显示附件模块（含下载）
          </label>
          {attachmentLinks.length ? (
            <div className="attachment-list">
              {attachmentLinks.map((item, idx) => (
                <div key={idx} className="attachment-item row">
                  <div className="thumb small">
                    {item.thumb ? <img src={item.thumb} alt={item.name} /> : null}
                  </div>
                  <div className="attachment-meta">
                    <div className="muted">{item.name}</div>
                    <div className="attachment-actions">
                      <input
                        readOnly
                        value={item.url}
                        onFocus={(e) => e.target.select()}
                        aria-label="图片URL"
                      />
                      <button
                        type="button"
                        className="ghost-btn copy-btn"
                        onClick={() => handleCopy(item.url)}
                      >
                        复制
                      </button>
                      <button
                        type="button"
                        className="ghost-btn copy-btn"
                        disabled={isRemoving}
                        onClick={() => handleRemoveAttachment(item.name)}
                      >
                        删除
                      </button>
                    </div>
                    <div className="attachment-actions">
                      <input
                        readOnly
                        value={item.imgTag}
                        onFocus={(e) => e.target.select()}
                        aria-label="IMG标签"
                      />
                      <button
                        type="button"
                        className="ghost-btn copy-btn"
                        onClick={() => handleCopy(item.imgTag)}
                      >
                        复制
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </label>
        <label className="full">
          标签
          <div className="tag-row">
            {tags?.map((tag) => (
              <label key={tag.id} className="pill checkbox">
                <input type="checkbox" value={tag.id} {...form.register('tags')} />
                {tag.name}
              </label>
            ))}
          </div>
        </label>
        <div className="form-actions">
          <button className="primary-btn" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
            {isPending ? '保存中' : '更新文章'}
          </button>
          <button
            className="danger-btn"
            type="button"
            disabled={isDeleting}
            onClick={() => setConfirmDelete(true)}
          >
            {isDeleting ? <Loader2 className="spin" size={16} /> : null}
            删除文章
          </button>
        </div>
      </form>
      {confirmDelete ? (
        <div className="confirm-backdrop">
          <div className="confirm-dialog">
            <h3>是否删除</h3>
            <p className="muted">删除后将无法恢复，确定要删除这篇文章吗？</p>
            <div className="confirm-actions">
              <button className="ghost-btn" type="button" onClick={() => setConfirmDelete(false)}>
                否
              </button>
              <button
                className="danger-btn"
                type="button"
                disabled={isDeleting}
                onClick={() => deletePost()}
              >
                {isDeleting ? <Loader2 className="spin" size={16} /> : null}
                是
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default EditPost
