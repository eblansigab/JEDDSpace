import { extractDocumentContent } from './contentExtractor.js'
import { getSupabaseServerClient } from './supabaseClient.js'

const getAttachmentType = (fileType) => {
  const lowerType = String(fileType || '').toLowerCase()
  if (lowerType.startsWith('image/')) return 'image'
  if (lowerType.startsWith('audio/')) return 'audio'
  if (lowerType) return 'document'
  return 'unknown'
}

export const processAttachment = async (file) => {
  const client = getSupabaseServerClient()

  try {
    const extracted = await extractDocumentContent({
      client,
      document: file,
      useCache: true,
    })

    return {
      content: extracted.content,
      type: getAttachmentType(file?.file_type),
      cached: extracted.cached,
    }
  } catch (error) {
    console.error('[AI] Attachment extraction failed', {
      documentId: file?.document_id,
      fileName: file?.file_name || file?.title,
      error: error?.message,
    })

    return {
      content: error?.message || 'Unable to analyze this attachment.',
      type: getAttachmentType(file?.file_type),
      error: true,
    }
  }
}

export const processAttachments = async (files) => {
  const results = await Promise.all(
    (files || []).map(async (file) => {
      const result = await processAttachment(file)
      return {
        ...file,
        extractedContent: result.content,
        attachmentType: result.type,
        extractionCached: result.cached,
        extractionError: result.error,
      }
    })
  )
  return results
}
