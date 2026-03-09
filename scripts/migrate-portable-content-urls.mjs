import { DatabaseSync } from 'node:sqlite'

const dbPath = process.argv[2] ?? 'pb_data/data.db'
const db = new DatabaseSync(dbPath)

const rows = db
  .prepare('SELECT id, slug, content FROM posts')
  .all()

const escapeAttr = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')

const toPortableMeta = (urlString) => {
  try {
    const url = new URL(urlString)
    const match = url.pathname.match(/^\/api\/files\/([^/]+)\/([^/]+)\/([^/]+)$/)

    if (!match) return null

    const [, collectionId, recordId, fileName] = match
    const thumb = url.searchParams.get('thumb')

    return {
      collectionId,
      recordId,
      fileName: decodeURIComponent(fileName),
      thumb: thumb && thumb !== 'undefined' ? thumb : '',
    }
  } catch {
    return null
  }
}

const metaToTagAttrs = (meta) => {
  const relativeSrc = meta.thumb
    ? `/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}?thumb=${encodeURIComponent(meta.thumb)}`
    : `/api/files/${meta.collectionId}/${meta.recordId}/${encodeURIComponent(meta.fileName)}`

  const attrs = [
    `src="${escapeAttr(relativeSrc)}"`,
    `data-pb-collection="${escapeAttr(meta.collectionId)}"`,
    `data-pb-record="${escapeAttr(meta.recordId)}"`,
    `data-pb-file="${escapeAttr(encodeURIComponent(meta.fileName))}"`,
  ]

  if (meta.thumb) {
    attrs.push(`data-pb-thumb="${escapeAttr(encodeURIComponent(meta.thumb))}"`)
  }

  return attrs.join(' ')
}

const replaceImgTags = (content) =>
  content.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc="([^"]+)"/i)
    const collectionMatch = tag.match(/\sdata-pb-collection="([^"]+)"/i)
    const recordMatch = tag.match(/\sdata-pb-record="([^"]+)"/i)
    const fileMatch = tag.match(/\sdata-pb-file="([^"]+)"/i)
    const thumbMatch = tag.match(/\sdata-pb-thumb="([^"]+)"/i)

    let meta =
      collectionMatch && recordMatch && fileMatch
        ? {
            collectionId: collectionMatch[1],
            recordId: recordMatch[1],
            fileName: decodeURIComponent(fileMatch[1]),
            thumb: thumbMatch ? decodeURIComponent(thumbMatch[1]) : '',
          }
        : null

    if (!meta && !srcMatch) return tag

    if (!meta && srcMatch) {
      meta = toPortableMeta(srcMatch[1])
    }

    if (!meta && srcMatch && srcMatch[1].startsWith('pb://file/')) {
      const portable = srcMatch[1].slice('pb://file/'.length)
      const [pathPart, queryPart = ''] = portable.split('?')
      const [collectionId, recordId, ...nameParts] = pathPart.split('/')
      if (collectionId && recordId && nameParts.length) {
        const params = new URLSearchParams(queryPart)
        meta = {
          collectionId,
          recordId,
          fileName: decodeURIComponent(nameParts.join('/')),
          thumb: params.get('thumb') || '',
        }
      }
    }

    if (!meta) return tag

    let nextTag = tag.replace(/\ssrc="([^"]+)"/i, '')
    nextTag = nextTag.replace(/\sdata-pb-collection="[^"]*"/gi, '')
    nextTag = nextTag.replace(/\sdata-pb-record="[^"]*"/gi, '')
    nextTag = nextTag.replace(/\sdata-pb-file="[^"]*"/gi, '')
    nextTag = nextTag.replace(/\sdata-pb-thumb="[^"]*"/gi, '')

    return nextTag.replace('<img', `<img ${metaToTagAttrs(meta)}`)
  })

const update = db.prepare('UPDATE posts SET content = ? WHERE id = ?')
let changed = 0

db.exec('BEGIN')

for (const row of rows) {
  const nextContent = replaceImgTags(row.content ?? '')

  if (nextContent !== row.content) {
    update.run(nextContent, row.id)
    changed += 1
  }
}

db.exec('COMMIT')

console.log(`portableized ${changed} post(s) in ${dbPath}`)
