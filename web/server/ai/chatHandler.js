import { detectIntent } from './intentDetector.js'
import { loadDataForIntent } from './dataLoader.js'
import { buildMessages } from './promptBuilder.js'
import { groqClient } from './groqClient.js'
import { getSupabaseServerClient } from './supabaseClient.js'
import { processAttachments } from './attachmentProcessor.js'
import { resolveDocumentReference } from './documentResolver.js'
import { extractDocumentContent } from './contentExtractor.js'

const logAI = (stage, details = {}) => {
  console.log('[AI]', stage, details)
}

const buildAttachmentContext = async (attachments = []) => {
  let attachmentContext = ''

  if (!attachments.length) return attachmentContext

  try {
    logAI('Processing attachments', { count: attachments.length })
    const processed = await processAttachments(attachments)
    for (const att of processed) {
      if (att.attachmentType === 'document' && att.extractedContent) {
        attachmentContext += `\n\nUploaded Document (${att.title || att.file_name}):\n${att.extractedContent.slice(0, 5000)}`
      } else if (att.attachmentType === 'image') {
        attachmentContext += `\n\nUploaded Image (${att.title || att.file_name}):\n${att.extractedContent || 'Image understanding is unavailable in the current text request.'}`
      } else if (att.attachmentType === 'audio') {
        attachmentContext += `\n\nUploaded Audio (${att.title || att.file_name}):\n${att.extractedContent || 'Audio transcription is not implemented yet.'}`
      }
    }
  } catch (error) {
    console.error('[AI] Attachment processing error:', error)
    attachmentContext += '\n\nUploaded Files:\nUnable to analyze one or more uploaded files.'
  }

  return attachmentContext
}

const buildReferencedDocumentContext = async ({ viewer, message, messages, attachments }) => {
  try {
    const client = getSupabaseServerClient()
    logAI('Resolving document', { message })
    const resolved = await resolveDocumentReference({
      client,
      viewer,
      message,
      messages,
      attachments,
    })

    if (!resolved?.document) return ''

    logAI('Downloading file', {
      reason: resolved.reason,
      documentId: resolved.document.document_id,
      fileName: resolved.document.file_name,
    })

    const extracted = await extractDocumentContent({
      client,
      document: resolved.document,
      useCache: true,
    })

    logAI('Extracting text', {
      documentId: resolved.document.document_id,
      cached: extracted.cached,
    })

    return [
      `Referenced Document (${resolved.document.title || resolved.document.file_name || resolved.document.document_id})`,
      `File: ${resolved.document.file_name || 'Unknown'}`,
      `Type: ${resolved.document.file_type || 'Unknown'}`,
      `Resolved By: ${resolved.reason}`,
      '',
      extracted.content,
    ].join('\n')
  } catch (error) {
    console.error('[AI] Document analysis failed', error)
    return `\n\nReferenced Document:\n${error?.message || 'Unable to analyze the selected document.'}`
  }
}

export const handleChat = async ({ viewer, payload = {} }) => {
  const { message, messages = [], attachments = [] } = payload

  if (!message) {
    return { status: 400, error: 'Message is required' }
  }

  const intent = detectIntent(message)
  logAI('Intent detected', { intent })

  const data = await loadDataForIntent(intent, message, viewer)
  let attachmentContext = await buildAttachmentContext(attachments)

  if (!attachmentContext) {
    attachmentContext = await buildReferencedDocumentContext({
      viewer,
      message,
      messages,
      attachments,
    })
  }

  logAI('Building prompt', { hasFileContext: Boolean(attachmentContext) })
  const groqMessages = buildMessages({ intent, message, data, messages, attachmentContext })

  logAI('Calling Groq')
  const response = await groqClient.chat(groqMessages)
  logAI('Returning response')

  try {
    await getSupabaseServerClient()
      .from('ai_chat_logs')
      .insert({
        user_id: viewer.employee?.user_id || viewer.user.id,
        prompt: message,
        response: response || null,
        intent,
      })
  } catch (error) {
    console.error('[AI] Failed to log chat:', error)
  }

  return {
    data: {
      response,
      intent,
    },
  }
}
