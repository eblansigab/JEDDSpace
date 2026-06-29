import { getSummaryByType, saveSummary } from './supabaseClient.js'
import { loadStoredFile } from './storageLoader.js'

const MAX_EXTRACTED_CHARS = 12000
const EXTRACTION_TIMEOUT_MS = 10000

export class ContentExtractionError extends Error {
  constructor(message, cause = null) {
    super(message)
    this.name = 'ContentExtractionError'
    this.cause = cause
  }
}

const normalizeMime = (document, contentType = '') => {
  return String(document?.file_type || contentType || '').toLowerCase()
}

const getExtension = (document) => {
  const name = String(document?.file_name || document?.title || '').toLowerCase()
  const match = name.match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
}

const decodeText = (arrayBuffer) => {
  return new TextDecoder('utf-8', { fatal: false })
    .decode(new Uint8Array(arrayBuffer))
    .split(String.fromCharCode(0))
    .join('')
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS)
}

const extractPdfText = (arrayBuffer) => {
  const raw = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer))
  const readable = (raw.match(/[\x20-\x7E]{4,}/g) || [])
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (readable.length < 80) {
    return 'PDF file retrieved, but readable text could not be extracted with the current runtime.'
  }

  return readable.slice(0, MAX_EXTRACTED_CHARS)
}

const unsupportedOfficeMessage = (label) => {
  return `${label} file retrieved, but full text extraction is not available in the current runtime. Use an exported TXT/CSV/PDF version for deeper analysis.`
}

const imageMessage = (document) => {
  return `Image file retrieved (${document.file_name || document.title || 'uploaded image'}). Visual image understanding is not available in the current Groq text request, so I can only use the filename, type, and metadata.`
}

const audioMessage = (document) => {
  return `Audio file retrieved (${document.file_name || document.title || 'uploaded audio'}). Transcription is not implemented yet.`
}

const withExtractionTimeout = async (promise) => {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new ContentExtractionError('Text extraction timed out.')), EXTRACTION_TIMEOUT_MS)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}

const extractByType = ({ document, arrayBuffer, contentType }) => {
  const mime = normalizeMime(document, contentType)
  const extension = getExtension(document)

  if (mime === 'text/plain' || extension === 'txt' || mime === 'text/csv' || extension === 'csv') {
    return decodeText(arrayBuffer)
  }

  if (mime === 'application/pdf' || extension === 'pdf') {
    return extractPdfText(arrayBuffer)
  }

  if (mime.includes('wordprocessingml') || extension === 'docx') {
    return unsupportedOfficeMessage('DOCX document')
  }

  if (mime.includes('spreadsheetml') || extension === 'xlsx') {
    return unsupportedOfficeMessage('XLSX spreadsheet')
  }

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    return imageMessage(document)
  }

  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(extension)) {
    return audioMessage(document)
  }

  return `File retrieved, but ${mime || extension || 'this file type'} is not supported for text extraction.`
}

export const extractDocumentContent = async ({ client, document, useCache = true }) => {
  if (!document?.document_id) {
    throw new ContentExtractionError('No document was selected for analysis.')
  }

  const cacheKey = `document_text_${document.document_id}`
  if (useCache) {
    const cached = await getSummaryByType(cacheKey)
    if (cached?.content_summary) {
      return {
        content: cached.content_summary,
        cached: true,
        source: 'cache',
      }
    }
  }

  try {
    const file = await loadStoredFile({ client, document })
    const content = await withExtractionTimeout(
      Promise.resolve(extractByType({ document, arrayBuffer: file.arrayBuffer, contentType: file.contentType })),
    )

    await saveSummary({
      referenceType: cacheKey,
      contentSummary: content,
      rawDataSnapshot: `Document: ${document.title || document.file_name || document.document_id}`,
    })

    return {
      content,
      cached: false,
      source: 'storage',
    }
  } catch (error) {
    if (error?.name === 'StorageLoaderError') {
      throw new ContentExtractionError('Unable to analyze the selected document because it could not be retrieved from storage.', error)
    }

    if (error?.name === 'ContentExtractionError') {
      throw error
    }

    throw new ContentExtractionError('Unable to analyze the selected document because its contents could not be read.', error)
  }
}
