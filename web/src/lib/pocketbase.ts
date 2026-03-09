import PocketBase, { type RecordModel } from 'pocketbase'

const configuredBaseUrl = import.meta.env.VITE_PB_URL as string | undefined
const baseUrl = (configuredBaseUrl ?? 'http://127.0.0.1:8090').replace(/\/$/, '')
export const pb = new PocketBase(baseUrl)

const PB_FILE_SCHEME = 'pb://file/'

pb.autoCancellation(false)

export const getFileUrl = (record: RecordModel, fileName?: string, thumb?: string) => {
  if (!fileName) return ''
  try {
    return thumb
      ? pb.files.getUrl(record, fileName, { thumb })
      : pb.files.getUrl(record, fileName)
  } catch (error) {
    console.error('failed to build file url', error)
    return ''
  }
}

export const isGifFile = (fileName?: string) => fileName?.toLowerCase().endsWith('.gif') ?? false

type PortableFileMeta = {
  collectionId: string
  recordId: string
  fileName: string
  thumb?: string
}

const getPortableFileMeta = (record: RecordModel, fileName?: string, thumb?: string): PortableFileMeta | null => {
  if (!fileName) return null

  const collectionId = String(record.collectionId ?? '')
  const recordId = String(record.id ?? '')

  if (!collectionId || !recordId) return null

  return {
    collectionId,
    recordId,
    fileName,
    thumb,
  }
}

const serializePortableFileRef = (meta: PortableFileMeta) => {
  const encodedName = encodeURIComponent(meta.fileName)
  const query = meta.thumb ? `?thumb=${encodeURIComponent(meta.thumb)}` : ''

  return `${PB_FILE_SCHEME}${meta.collectionId}/${meta.recordId}/${encodedName}${query}`
}

const parsePortableFileRef = (value: string): PortableFileMeta | null => {
  if (!value.startsWith(PB_FILE_SCHEME)) return null

  const raw = value.slice(PB_FILE_SCHEME.length)
  const [pathPart, queryPart = ''] = raw.split('?')
  const [collectionId, recordId, ...nameParts] = pathPart.split('/')

  if (!collectionId || !recordId || !nameParts.length) return null

  const fileName = decodeURIComponent(nameParts.join('/'))
  const params = new URLSearchParams(queryPart)
  const thumb = params.get('thumb')

  return {
    collectionId,
    recordId,
    fileName,
    thumb: thumb || undefined,
  }
}

export const getPortableFileRef = (record: RecordModel, fileName?: string, thumb?: string) => {
  const meta = getPortableFileMeta(record, fileName, thumb)
  return meta ? serializePortableFileRef(meta) : ''
}

export const getPortableImageAttrs = (record: RecordModel, fileName?: string, thumb?: string) => {
  const meta = getPortableFileMeta(record, fileName, thumb)
  if (!meta) return ''

  const relativeSrc = meta.thumb
    ? `/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}?thumb=${encodeURIComponent(meta.thumb)}`
    : `/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}`

  const attrs = [
    `src="${relativeSrc}"`,
    `data-pb-collection="${meta.collectionId}"`,
    `data-pb-record="${meta.recordId}"`,
    `data-pb-file="${encodeURIComponent(meta.fileName)}"`,
  ]

  if (meta.thumb) {
    attrs.push(`data-pb-thumb="${encodeURIComponent(meta.thumb)}"`)
  }

  return attrs.join(' ')
}

export const buildPortableImageTag = (
  record: RecordModel,
  fileName?: string,
  options?: { alt?: string; width?: string },
) => {
  const attrs = getPortableImageAttrs(record, fileName)
  if (!attrs) return ''

  const width = options?.width?.trim()
  const style = width
    ? ` style="width:${width}px;max-width:100%;height:auto;"`
    : ' style="max-width:100%;height:auto;"'
  const alt = (options?.alt ?? '').replace(/"/g, '&quot;')

  return `<img ${attrs}${style} alt="${alt}" />`
}

export const buildImageTagFromInput = (
  rawInput: string,
  options?: { width?: string; alt?: string },
) => {
  const trimmed = rawInput.trim()
  const normalizedWidth = options?.width?.trim()
  const style = normalizedWidth
    ? ` style="width:${normalizedWidth}px;max-width:100%;height:auto;"`
    : ' style="max-width:100%;height:auto;"'

  const srcMatch = trimmed.match(/<img[^>]+src=["']([^"']+)["']/i)
  const collectionMatch = trimmed.match(/data-pb-collection=["']([^"']+)["']/i)
  const recordMatch = trimmed.match(/data-pb-record=["']([^"']+)["']/i)
  const fileMatch = trimmed.match(/data-pb-file=["']([^"']+)["']/i)
  const altMatch = trimmed.match(/alt=["']([^"']*)["']/i)
  const thumbMatch = trimmed.match(/data-pb-thumb=["']([^"']+)["']/i)

  const alt = (altMatch?.[1] ?? options?.alt ?? '').replace(/"/g, '&quot;')

  if (collectionMatch?.[1] && recordMatch?.[1] && fileMatch?.[1]) {
    const attrs = [
      `src="/api/files/${collectionMatch[1]}/${recordMatch[1]}/${fileMatch[1]}${
        thumbMatch?.[1] ? `?thumb=${thumbMatch[1]}` : ''
      }"`,
      `data-pb-collection="${collectionMatch[1]}"`,
      `data-pb-record="${recordMatch[1]}"`,
      `data-pb-file="${fileMatch[1]}"`,
    ]

    if (thumbMatch?.[1]) {
      attrs.push(`data-pb-thumb="${thumbMatch[1]}"`)
    }

    return `<img ${attrs.join(' ')}${style} alt="${alt}" />`
  }

  const src = (srcMatch?.[1] ?? trimmed).replace(/"/g, '&quot;')
  return `<img src="${src}"${style} alt="${alt}" />`
}

const resolvePortableMeta = (meta: PortableFileMeta) =>
  meta.thumb
    ? `${baseUrl}/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}?thumb=${encodeURIComponent(meta.thumb)}`
    : `${baseUrl}/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}`

const buildRelativePortableSrc = (meta: PortableFileMeta) =>
  meta.thumb
    ? `/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}?thumb=${encodeURIComponent(meta.thumb)}`
    : `/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}`

export const renderPortableContent = (html?: string) => {
  if (!html) return ''

  if (typeof DOMParser === 'undefined') {
    return html.replace(/pb:\/\/file\/[^\s"'<>]+/g, (match) => {
      const meta = parsePortableFileRef(match)
      return meta ? resolvePortableMeta(meta) : match
    })
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const collectionId = img.dataset.pbCollection
    const recordId = img.dataset.pbRecord
    const encodedFile = img.dataset.pbFile
    const encodedThumb = img.dataset.pbThumb

    if (collectionId && recordId && encodedFile) {
      const meta: PortableFileMeta = {
        collectionId,
        recordId,
        fileName: decodeURIComponent(encodedFile),
        thumb: encodedThumb ? decodeURIComponent(encodedThumb) : undefined,
      }
      img.src = resolvePortableMeta(meta)
      return
    }

    const src = img.getAttribute('src')
    if (!src) return

    const meta = parsePortableFileRef(src)
    if (!meta) return

    img.removeAttribute('src')
    img.dataset.pbCollection = meta.collectionId
    img.dataset.pbRecord = meta.recordId
    img.dataset.pbFile = encodeURIComponent(meta.fileName)
    if (meta.thumb) {
      img.dataset.pbThumb = encodeURIComponent(meta.thumb)
    }
    img.src = resolvePortableMeta(meta)
  })

  return doc.body.innerHTML
}

export const normalizePortableContentForStorage = (html?: string) => {
  if (!html) return ''

  if (typeof DOMParser === 'undefined') {
    return html
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const collectionId = img.dataset.pbCollection
    const recordId = img.dataset.pbRecord
    const encodedFile = img.dataset.pbFile
    const encodedThumb = img.dataset.pbThumb

    if (!collectionId || !recordId || !encodedFile) return

    const meta: PortableFileMeta = {
      collectionId,
      recordId,
      fileName: decodeURIComponent(encodedFile),
      thumb: encodedThumb ? decodeURIComponent(encodedThumb) : undefined,
    }

    img.src = buildRelativePortableSrc(meta)
  })

  return doc.body.innerHTML
}

export const removePortableImageFromContent = (html: string, fileName: string) => {
  if (!html) return html

  const encoded = encodeURIComponent(fileName)

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(new RegExp(`<img[^>]*data-pb-file="${encoded}"[^>]*>`, 'gi'), '')
      .replace(new RegExp(`<img[^>]*src="[^"]*${encoded}[^"]*"[^>]*>`, 'gi'), '')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    const matchFile = img.dataset.pbFile === encoded
    const matchSrc = img.getAttribute('src')?.includes(encoded)
    if (matchFile || matchSrc) {
      img.remove()
    }
  })

  return doc.body.innerHTML
}

export { baseUrl as pocketbaseUrl }
