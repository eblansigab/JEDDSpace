const DEFAULT_TIMEOUT_MS = 12000
const DOCUMENT_BUCKET = 'document'

export class StorageLoaderError extends Error {
  constructor(message, cause = null) {
    super(message)
    this.name = 'StorageLoaderError'
    this.cause = cause
  }
}

export const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new StorageLoaderError(timeoutMessage)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}

const stripBucketPrefix = (path) => {
  const cleanPath = String(path || '').replace(/^\/+/, '')
  return cleanPath.startsWith(`${DOCUMENT_BUCKET}/`)
    ? cleanPath.slice(DOCUMENT_BUCKET.length + 1)
    : cleanPath
}

const fetchPublicFile = async (fileUrl, timeoutMs) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(fileUrl, { signal: controller.signal })
    if (!response.ok) {
      throw new StorageLoaderError(`Storage download failed with status ${response.status}`)
    }

    return {
      arrayBuffer: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') || '',
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new StorageLoaderError('Storage download timed out.', error)
    }
    throw error instanceof StorageLoaderError
      ? error
      : new StorageLoaderError('Unable to retrieve the selected file from storage.', error)
  } finally {
    clearTimeout(timeoutId)
  }
}

const downloadStoragePath = async (client, filePath, timeoutMs) => {
  const storagePath = stripBucketPrefix(filePath)
  const download = client.storage.from(DOCUMENT_BUCKET).download(storagePath)
  const { data, error } = await withTimeout(
    download,
    timeoutMs,
    'Storage download timed out.'
  )

  if (error || !data) {
    throw new StorageLoaderError('Unable to retrieve the selected file from storage.', error)
  }

  return {
    arrayBuffer: await data.arrayBuffer(),
    contentType: data.type || '',
  }
}

export const loadStoredFile = async ({ client, document, timeoutMs = DEFAULT_TIMEOUT_MS }) => {
  const filePath = document?.file_path
  if (!filePath) {
    throw new StorageLoaderError('The selected document does not have a storage path.')
  }

  if (/^https?:\/\//i.test(filePath)) {
    return await fetchPublicFile(filePath, timeoutMs)
  }

  return await downloadStoragePath(client, filePath, timeoutMs)
}
