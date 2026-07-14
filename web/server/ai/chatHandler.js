import { detectIntent, isGeneralKnowledgeQuestion } from './intentDetector.js'
import { buildAIContext } from './contextBuilder.js'
import { buildMessages } from './promptBuilder.js'
import { groqClient } from './groqClient.js'
import { getSupabaseServerClient } from './supabaseClient.js'
import { createRequestContext, timedStage } from './pipeline.js'
import { isAllowedJEDDSpaceIntent } from './entityResolver.js'

const buildClarificationResponse = (lowConfidenceEntities = []) => {
  const entityTypes = lowConfidenceEntities
    .map((entity) => entity.type)
    .filter(Boolean)
    .join(', ')

  return `I found a possible ${entityTypes || 'entity'} match, but I am not confident enough to use it safely. Please specify the exact document, employee, contract, job, or leave record you want me to analyze.`
}

const saveMetrics = async ({ requestContext, viewer, intent, message, response, context, groqResult = null }) => {
  const metrics = {
    ...requestContext.metrics(),
    groqModel: groqResult?.model || null,
    groqLatencyMs: groqResult?.latencyMs || null,
    conversationLength: context?.conversationLength || 0,
    sessionId: context?.sessionId || 'default',
    entityResolutionSucceeded: Boolean(context?.entityContext),
    referencedEntities: context?.entities || {},
    warnings: context?.warnings || [],
  }

  try {
    await getSupabaseServerClient()
      .from('ai_summarization')
      .insert({
        reference_type: `ai_metric_${requestContext.requestId}`,
        content_summary: JSON.stringify({
          user_id: viewer.employee?.user_id || viewer.user.id,
          intent,
          prompt: message,
          response,
        }),
        raw_data_snapshot: JSON.stringify(metrics),
      })
  } catch (error) {
    requestContext.fail('metrics:error', error)
  }

  return metrics
}

const prepareChat = async ({ viewer, payload = {} }) => {
  const { message, messages = [], attachments = [], sessionId = 'default' } = payload
  const requestContext = createRequestContext()

  if (!message) {
    return { error: { status: 400, message: 'Message is required' }, requestContext }
  }

  const intent = detectIntent(message)
  const allowedScope = isAllowedJEDDSpaceIntent(intent, message)
  requestContext.log('intent:detected', { intent, sessionId, allowedScope })

  if (!allowedScope) {
    return {
      requestContext,
      intent,
      message,
      messages,
      sessionId,
      rejection:
        "I'm designed specifically to assist with JEDDTech operations, employees, documents, contracts, leave requests, notifications, and other organizational information. Your question appears unrelated to those areas, so I'm unable to provide an answer.",
    }
  }

  const generalKnowledge = isGeneralKnowledgeQuestion(message)

  const context = await buildAIContext({ viewer, intent, message, messages, attachments, requestContext })

  if (context.lowConfidenceEntities?.length) {
    const response = buildClarificationResponse(context.lowConfidenceEntities)
    requestContext.log('entity:clarification_required', {
      lowConfidenceEntities: context.lowConfidenceEntities.map((entity) => ({
        type: entity.type,
        reason: entity.reason,
        confidence: entity.confidence,
      })),
    })

    const metrics = await saveMetrics({
      requestContext,
      viewer,
      intent,
      message,
      response,
      context: { ...context, conversationLength: messages.length },
    })

    return {
      clarification: {
        response,
        intent,
        referencedEntities: context.entities,
        warnings: context.warnings,
        metrics,
      },
      requestContext,
    }
  }

  requestContext.log('prompt:build:start', {
    hasFileContext: Boolean(context.attachmentContext),
    hasEntityContext: Boolean(context.entityContext),
    warnings: context.warnings,
  })
  const groqMessages = buildMessages({
    intent,
    message,
    data: context.data,
    messages,
    attachmentContext: context.attachmentContext,
    entityContext: context.entityContext,
    warningContext: context.warnings?.join('\n') || '',
    recentContext: context.recentContext,
    generalKnowledge,
    viewer,
  })
  requestContext.log('prompt:build:complete')

  return {
    requestContext,
    intent,
    message,
    messages,
    sessionId,
    context,
    groqMessages,
  }
}

export const handleChat = async ({ viewer, payload = {} }) => {
  const prepared = await prepareChat({ viewer, payload })

  if (prepared.error) {
    return { status: prepared.error.status, error: prepared.error.message }
  }

  if (prepared.clarification) {
    return { data: prepared.clarification }
  }

  if (prepared.rejection) {
    return {
      data: {
        response: prepared.rejection,
        intent: prepared.intent,
        referencedEntities: {},
        warnings: [],
        metrics: {},
      },
    }
  }

  const { requestContext, intent, message, messages = [], sessionId, context, groqMessages } = prepared

    const groqResult = await timedStage(
      'groq',
      () => groqClient.chatWithMetadata(groqMessages),
      { model: 'gpt-oss-120b' }
    )
  const response = groqResult.content

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
    requestContext.fail('chat-log:error', error)
  }

  requestContext.log('response:sent', {
    intent,
    groqLatencyMs: groqResult.latencyMs,
    model: groqResult.model,
  })

  const metrics = await saveMetrics({
    requestContext,
    viewer,
    intent,
    message,
    response,
    context: { ...context, conversationLength: messages.length, sessionId },
    groqResult,
  })

  return {
    data: {
      response,
      intent,
      referencedEntities: context.entities,
      warnings: context.warnings,
      metrics,
    },
  }
}

export const handleChatStream = async ({ viewer, payload = {}, sendEvent }) => {
  const prepared = await prepareChat({ viewer, payload })

  if (prepared.error) {
    sendEvent('error', { error: prepared.error.message })
    return
  }

  if (prepared.clarification) {
    sendEvent('progress', { message: 'Clarifying reference...' })
    sendEvent('token', { token: prepared.clarification.response })
    sendEvent('done', prepared.clarification)
    return
  }

  if (prepared.rejection) {
    sendEvent('progress', { message: 'Out of scope' })
    sendEvent('token', { token: prepared.rejection })
    sendEvent('done', {
      response: prepared.rejection,
      intent: prepared.intent,
      referencedEntities: {},
      warnings: [],
      metrics: {},
    })
    return
  }

  const { requestContext, intent, message, messages = [], sessionId, context, groqMessages } = prepared
  let response = ''
  const groqStartedAt = Date.now()

  sendEvent('progress', { message: 'Generating answer...' })
  requestContext.log('groq:stream:start', { model: 'gpt-oss-120b' })

  for await (const token of groqClient.streamChat(groqMessages)) {
    response += token
    sendEvent('token', { token })
  }

  const groqResult = {
    model: 'gpt-oss-120b',
    latencyMs: Date.now() - groqStartedAt,
  }
  requestContext.log('groq:stream:complete', { latencyMs: groqResult.latencyMs })

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
    requestContext.fail('chat-log:error', error)
  }

  const metrics = await saveMetrics({
    requestContext,
    viewer,
    intent,
    message,
    response,
    context: { ...context, conversationLength: messages.length, sessionId },
    groqResult,
  })

  sendEvent('done', {
    response,
    intent,
    referencedEntities: context.entities,
    warnings: context.warnings,
    metrics,
  })
}
