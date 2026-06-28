import { detectIntent } from './ai/intentDetector.js'
import { loadDataForIntent } from './ai/dataLoader.js'
import { buildMessages } from './ai/promptBuilder.js'
import { groqClient } from './ai/groqClient.js'
import { getRequestUserContext, getSupabaseServerClient } from './ai/supabaseClient.js'
import { processAttachments } from './ai/attachmentProcessor.js'

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
    const data = await loadDataForIntent(intent, message, viewer)

    let attachmentContext = ''
    if (attachments && attachments.length > 0) {
      try {
        const processed = await processAttachments(attachments)
        for (const att of processed) {
          if (att.attachmentType === 'document' && att.extractedContent) {
            attachmentContext += `\n\nUploaded Document (${att.title || att.file_name}):\n${att.extractedContent.slice(0, 5000)}`
          } else if (att.attachmentType === 'image') {
            attachmentContext += `\n\nUploaded Image (${att.title || att.file_name}):\n[Image ready for analysis]`
          } else if (att.attachmentType === 'audio') {
            attachmentContext += `\n\nUploaded Audio (${att.title || att.file_name}):\n[Audio ready for transcription]`
          }
        }
      } catch (attError) {
        console.error('[api/chat] Attachment processing error:', attError)
      }
    }

    const groqMessages = buildMessages({ intent, message, data, messages, attachmentContext })
    const response = await groqClient.chat(groqMessages)

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
