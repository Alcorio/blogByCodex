import PocketBase, { type RecordModel } from 'pocketbase'

const baseUrl = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090'
export const pb = new PocketBase(baseUrl)

pb.autoCancellation(false)

export const getFileUrl = (record: RecordModel, fileName?: string, thumb?: string) => {
  if (!fileName) return ''
  try {
    return pb.files.getUrl(record, fileName, { thumb })
  } catch (error) {
    console.error('failed to build file url', error)
    return ''
  }
}

export { baseUrl as pocketbaseUrl }
