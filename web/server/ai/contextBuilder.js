import { processAttachments } from './attachmentProcessor.js'
import { extractDocumentContent } from './contentExtractor.js'
import { loadDataForIntent } from './dataLoader.js'
import { detectReference, isCapabilityQuestion, isPureGreeting, isGeneralKnowledgeQuestion, shouldResolveEntities, resolveEntities, formatResolvedEntities, getLowConfidenceEntities } from './entityResolver.js'
import { timedStage, withTimeout } from './pipeline.js'
import { getSupabaseServerClient } from './supabaseClient.js'
import { resolveRecentContext, hasCurrentEntityReference } from './recentContextResolver.js'

const DATABASE_TIMEOUT_MS = 12000

const buildAttachmentContext = async (attachments = [], requestContext = null) => {
  let attachmentContext = ''

  if (!attachments.length) return attachmentContext

  try {
    requestContext?.log?.('attachments:start', { count: attachments.length })
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
    requestContext?.fail?.('attachments:error', error)
    attachmentContext += '\n\nUploaded Files:\nUnable to analyze one or more uploaded files.'
  }

  return attachmentContext
}

const buildReferencedDocumentContext = async ({ client, entities, requestContext }) => {
  const resolved = entities?.document
  if (!resolved?.document) return ''

  try {
    requestContext?.log?.('document:download:start', {
      reason: resolved.reason,
      documentId: resolved.document.document_id,
      fileName: resolved.document.file_name,
    })

    const extracted = await extractDocumentContent({
      client,
      document: resolved.document,
      useCache: true,
    })

    requestContext?.log?.('document:extract:complete', {
      documentId: resolved.document.document_id,
      cached: extracted.cached,
      source: extracted.source,
      extractedAt: extracted.extractedAt,
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
    requestContext?.fail?.('document:error', error)
    return `\n\nReferenced Document:\n${error?.message || 'Unable to analyze the selected document.'}`
  }
}

export const buildAIContext = async ({ viewer, intent, message, messages = [], attachments = [], requestContext = null }) => {
  const client = getSupabaseServerClient()
  let entities = {}
  let data = {}
  const warnings = []

  const trimmedMessage = String(message || '').trim()
  const referenceDetected = detectReference(trimmedMessage)
  const capabilityQuestion = isCapabilityQuestion(trimmedMessage)
  const greeting = isPureGreeting(trimmedMessage)
  const generalKnowledge = isGeneralKnowledgeQuestion(trimmedMessage)
  const currentEntityReference = hasCurrentEntityReference(trimmedMessage)
  const recentContext = currentEntityReference ? resolveRecentContext({ message: trimmedMessage, messages }) : {}
  const shouldResolve = shouldResolveEntities(trimmedMessage, intent, attachments)

  requestContext?.log?.('intent:detected', { intent })
  requestContext?.log?.('reference:detected', { detected: referenceDetected })
  requestContext?.log?.('routing:classification', {
    intent,
    capabilityQuestion,
    greeting,
    generalKnowledge,
    currentEntityReference,
    recentContext,
    attachmentsCount: attachments.length,
  })
  requestContext?.log?.('entity:resolution:planned', {
    executed: shouldResolve,
    reason: generalKnowledge
      ? 'general_knowledge_skipped'
      : currentEntityReference
        ? 'current_entity_reference'
        : capabilityQuestion
          ? 'capability_question'
          : greeting
            ? 'greeting_with_reference'
            : 'standard',
  })

  if (shouldResolve) {
    try {
      entities = await timedStage(
        requestContext,
        'entities',
        () => withTimeout(
          resolveEntities({ client, viewer, message: trimmedMessage, messages, attachments }),
          DATABASE_TIMEOUT_MS,
          'Entity resolution exceeded the allowed processing time.'
        ),
        { intent }
      )
    } catch (error) {
      warnings.push('Entity resolution failed, so follow-up references may need to be stated explicitly.')
      requestContext?.fail?.('entities:degraded', error)
    }
  } else if (capabilityQuestion) {
    requestContext?.log?.('entity:resolution:skipped', {
      reason: 'capability_question_without_data_request',
      intent,
      referenceDetected,
      capabilityQuestion,
      greeting,
    })
  } else if (greeting) {
    requestContext?.log?.('entity:resolution:skipped', {
      reason: 'pure_greeting_without_entity_reference',
      intent,
      referenceDetected,
      capabilityQuestion,
      greeting,
    })
  } else if (generalKnowledge) {
    requestContext?.log?.('entity:resolution:skipped', {
      reason: 'general_knowledge_question',
      intent,
      referenceDetected,
      generalKnowledge,
    })
  } else if (intent === 'general') {
    requestContext?.log?.('entity:resolution:skipped', {
      reason: 'general_intent_no_reference',
      intent,
      referenceDetected,
    })
  } else {
    requestContext?.log?.('entity:resolution:skipped', {
      reason: 'no_reference_detected',
      intent,
      referenceDetected,
    })
  }

  if (currentEntityReference && !entities.document) {
    const documentFromContext = recentContext.document
    if (documentFromContext) {
      requestContext?.log?.('recent:context:document', { documentFromContext })
    }
  }

  try {
    data = await timedStage(
      requestContext,
      'database',
      () => withTimeout(
        loadDataForIntent(intent, message, viewer),
        DATABASE_TIMEOUT_MS,
        'Database retrieval exceeded the allowed processing time.'
      ),
      { intent }
    )
  } catch (error) {
    warnings.push('Database context is unavailable, so the answer may rely only on uploaded files and conversation context.')
    requestContext?.fail?.('database:degraded', error)
  }

  let attachmentContext = await buildAttachmentContext(attachments, requestContext)
  const referencedDocumentContext = await buildReferencedDocumentContext({ client, entities, requestContext })
  if (attachmentContext && referencedDocumentContext) {
    attachmentContext = `${attachmentContext}\n\n${referencedDocumentContext}`
  } else if (referencedDocumentContext) {
    attachmentContext = referencedDocumentContext
  }

  const lowConfidenceEntities = getLowConfidenceEntities(entities)
  if (lowConfidenceEntities.length) {
    warnings.push('One or more follow-up references had low confidence. Ask the user to clarify if the answer depends on that entity.')
  }

  return {
    data,
    attachmentContext,
    entityContext: formatResolvedEntities(entities),
    entities,
    warnings,
    lowConfidenceEntities,
    recentContext,
  }
}
