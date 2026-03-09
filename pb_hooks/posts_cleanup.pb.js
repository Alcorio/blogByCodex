onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = record.original()

  const previous = original.getStringSlice('attachments') || []
  const current = record.getStringSlice('attachments') || []
  const removed = previous.filter((name) => !current.includes(name))

  if (!removed.length) {
    return
  }

  const fs = $app.newFilesystem()

  try {
    const basePath = `${record.collectionId}/${record.id}`

    for (const fileName of removed) {
      try {
        fs.delete(`${basePath}/${fileName}`)
      } catch (_) {
        // Best-effort cleanup only; never fail the record update.
      }

      try {
        fs.deletePrefix(`${basePath}/thumbs_${fileName}`)
      } catch (_) {
        // Best-effort cleanup only; never fail the record update.
      }
    }
  } finally {
    fs.close()
  }
}, 'posts')
