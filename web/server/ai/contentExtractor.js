import { Buffer } from 'node:buffer'
import { inflateRawSync } from 'node:zlib'
import { groqClient } from './groqClient.js'
import { getSummaryByType, saveSummary } from './supabaseClient.js'
import { loadStoredFile } from './storageLoader.js'

const MAX_EXTRACTED_CHARS = 12000
const EXTRACTION_TIMEOUT_MS = 10000
const CACHE_VERSION = 'document_text_v2'

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

const asBytes = (arrayBuffer) => new Uint8Array(arrayBuffer)

const findEndOfCentralDirectory = (bytes) => {
  const minOffset = Math.max(0, bytes.length - 0xffff - 22)
  for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset
    }
  }
  return -1
}

const readZipEntries = (arrayBuffer) => {
  const bytes = asBytes(arrayBuffer)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findEndOfCentralDirectory(bytes)

  if (eocdOffset < 0) {
    throw new ContentExtractionError('The Office document could not be read because its ZIP structure is invalid.')
  }

  const entryCount = view.getUint16(eocdOffset + 10, true)
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true)
  const entries = new Map()
  let offset = centralDirectoryOffset

  for (let index = 0; index < entryCount; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break

    const compressionMethod = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const fileNameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const fileName = new TextDecoder('utf-8').decode(bytes.slice(offset + 46, offset + 46 + fileNameLength))

    if (view.getUint32(localHeaderOffset, true) === 0x04034b50) {
      const localNameLength = view.getUint16(localHeaderOffset + 26, true)
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
      const compressed = bytes.slice(dataStart, dataStart + compressedSize)

      entries.set(fileName, () => {
        if (compressionMethod === 0) return compressed
        if (compressionMethod === 8) return inflateRawSync(Buffer.from(compressed))
        throw new ContentExtractionError(`Unsupported ZIP compression method ${compressionMethod}.`)
      })
    }

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

const decodeXmlEntities = (value) => {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

const xmlToPlainText = (xml) => {
  return decodeXmlEntities(
    String(xml || '')
      .replace(/<w:tab\b[^>]*\/>/g, '\t')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<\/w:tc>/g, '\t')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

const extractDocxText = (arrayBuffer) => {
  const entries = readZipEntries(arrayBuffer)
  const relevantEntries = [...entries.keys()]
    .filter((name) =>
      name === 'word/document.xml' ||
      /^word\/(header|footer|footnotes|endnotes|comments)\d*\.xml$/.test(name)
    )
    .sort((a, b) => {
      if (a === 'word/document.xml') return -1
      if (b === 'word/document.xml') return 1
      return a.localeCompare(b)
    })

  if (!relevantEntries.includes('word/document.xml')) {
    throw new ContentExtractionError('The DOCX file does not contain a readable Word document body.')
  }

  const text = relevantEntries
    .map((name) => {
      const bytes = entries.get(name)()
      const xml = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      return xmlToPlainText(xml)
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()

  if (!text) {
    throw new ContentExtractionError('The DOCX file was opened, but no readable text was found.')
  }

  return text.slice(0, MAX_EXTRACTED_CHARS)
}

const extractXlsxText = (arrayBuffer) => {
  const entries = readZipEntries(arrayBuffer)
  const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.()
  const sharedStrings = sharedStringsXml
    ? [...new TextDecoder('utf-8', { fatal: false }).decode(sharedStringsXml).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)]
      .map((match) => xmlToPlainText(match[1]))
    : []

  const sheetNames = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b))

  const rows = sheetNames.flatMap((name, sheetIndex) => {
    const xml = new TextDecoder('utf-8', { fatal: false }).decode(entries.get(name)())
    const rowMatches = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)]

    return [
      `Sheet ${sheetIndex + 1}`,
      ...rowMatches.map((rowMatch) => {
        const cellMatches = [...rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)]
        return cellMatches
          .map((cellMatch) => {
            const attrs = cellMatch[1]
            const body = cellMatch[2]
            const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] || body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || ''
            if (attrs.includes('t="s"')) return sharedStrings[Number(value)] || ''
            return decodeXmlEntities(value)
          })
          .filter(Boolean)
          .join(' | ')
      }).filter(Boolean),
    ]
  })

  const text = rows.join('\n').trim()
  if (!text) {
    throw new ContentExtractionError('The XLSX file was opened, but no readable worksheet text was found.')
  }

  return text.slice(0, MAX_EXTRACTED_CHARS)
}

const imageMessage = async ({ document, arrayBuffer, mime }) => {
  const imageMime = mime || document.file_type || 'image/png'
  const dataUrl = `data:${imageMime};base64,${Buffer.from(arrayBuffer).toString('base64')}`

  try {
    const analysis = await groqClient.analyzeImage({
      dataUrl,
      prompt: 'Describe the image or screenshot. Extract visible text, important UI elements, diagrams, and business-relevant details. If it is a screenshot, summarize what the screen shows.',
    })

    return analysis.configured
      ? analysis.content || 'Image was processed, but no visual details were returned.'
      : `Image file retrieved (${document.file_name || document.title || 'uploaded image'}). ${analysis.content}`
  } catch (error) {
    return `Image file retrieved (${document.file_name || document.title || 'uploaded image'}), but visual analysis failed: ${error?.message || 'Unknown image analysis error.'}`
  }
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

const extractByType = async ({ document, arrayBuffer, contentType }) => {
  const mime = normalizeMime(document, contentType)
  const extension = getExtension(document)

  if (mime === 'text/plain' || extension === 'txt' || mime === 'text/csv' || extension === 'csv') {
    return decodeText(arrayBuffer)
  }

  if (mime === 'application/pdf' || extension === 'pdf') {
    return extractPdfText(arrayBuffer)
  }

  if (mime.includes('wordprocessingml') || extension === 'docx') {
    return extractDocxText(arrayBuffer)
  }

  if (mime.includes('spreadsheetml') || extension === 'xlsx') {
    return extractXlsxText(arrayBuffer)
  }

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    return await imageMessage({ document, arrayBuffer, mime: mime || contentType })
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

  const sourceFingerprint = [
    document.document_id,
    document.file_path,
    document.file_size,
    document.updated_at,
    document.created_at,
  ].filter(Boolean).join('|')
  const cacheKey = `${CACHE_VERSION}_${document.document_id}`
  if (useCache) {
    const cached = await getSummaryByType(cacheKey)
    if (cached?.content_summary && (!cached.raw_data_snapshot || cached.raw_data_snapshot.includes(sourceFingerprint))) {
      return {
        content: cached.content_summary,
        cached: true,
        source: 'cache',
        extractedAt: cached.raw_data_snapshot?.match(/Extracted at: ([^\n]+)/)?.[1] || null,
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
      rawDataSnapshot: [
        `Document: ${document.title || document.file_name || document.document_id}`,
        `Source fingerprint: ${sourceFingerprint}`,
        `Extracted at: ${new Date().toISOString()}`,
      ].join('\n'),
    })

    return {
      content,
      cached: false,
      source: 'storage',
      extractedAt: new Date().toISOString(),
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
