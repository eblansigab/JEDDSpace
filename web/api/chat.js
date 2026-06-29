import { detectIntent } from './ai/intentDetector.js'
import { loadDataForIntent } from './ai/dataLoader.js'
import { buildMessages } from './ai/promptBuilder.js'
import { groqClient } from './ai/groqClient.js'
import { getRequestUserContext, getSupabaseServerClient } from './ai/supabaseClient.js'
import { processAttachments } from './ai/attachmentProcessor.js'
import { resolveDocumentReference } from './ai/documentResolver.js'
import { extractDocumentContent } from './ai/contentExtractor.js'

const logAI = (stage, details = {}) => {
  console.log('[AI]', stage, details)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, messages = [], attachments } = req.body || {}

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const viewer = await getRequestUserContext(req)
    if (!viewer?.user?.id) {
      return res.status(401).json({ error: 'Authentication is required to use the AI assistant.' })
    }

    const intent = detectIntent(message)
    logAI('Intent detected', { intent })

    const data = await loadDataForIntent(intent, message, viewer)

    let attachmentContext = ''
    if (attachments && attachments.length > 0) {
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
      } catch (attError) {
        console.error('[api/chat] Attachment processing error:', attError)
        attachmentContext += '\n\nUploaded Files:\nUnable to analyze one or more uploaded files.'
      }
    }

    if (!attachmentContext) {
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

        if (resolved?.document) {
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

          attachmentContext += [
            `Referenced Document (${resolved.document.title || resolved.document.file_name || resolved.document.document_id})`,
            `File: ${resolved.document.file_name || 'Unknown'}`,
            `Type: ${resolved.document.file_type || 'Unknown'}`,
            `Resolved By: ${resolved.reason}`,
            '',
            extracted.content,
          ].join('\n')
        }
      } catch (docError) {
        console.error('[AI] Document analysis failed', docError)
        attachmentContext += `\n\nReferenced Document:\n${docError?.message || 'Unable to analyze the selected document.'}`
      }
    }

    logAI('Building prompt', {
      hasFileContext: Boolean(attachmentContext),
    })
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
          intent
        })
    } catch (insertError) {
      console.error('[api/chat] Failed to log chat:', insertError)
    }

    return res.status(200).json({ response })
  } catch (error) {
    console.error('[api/chat]', error)
    return res.status(500).json({ error: 'AI service is currently unavailable.' })
  }
}
