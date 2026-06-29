const DEFAULT_TIMEOUT_MESSAGE = 'Operation exceeded the allowed processing time.'

export class PipelineTimeoutError extends Error {
  constructor(message = DEFAULT_TIMEOUT_MESSAGE, cause = null) {
    super(message)
    this.name = 'PipelineTimeoutError'
    this.cause = cause
  }
}

export const createRequestContext = () => {
  const startedAt = Date.now()
  const requestId = `ai_${startedAt.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const stages = []

  const log = (stage, details = {}) => {
    const elapsedMs = Date.now() - startedAt
    const entry = {
      requestId,
      timestamp: new Date().toISOString(),
      stage,
      elapsedMs,
      ...details,
    }
    stages.push(entry)
    console.log('[AI]', entry)
    return entry
  }

  const fail = (stage, error, details = {}) => {
    return log(stage, {
      ...details,
      error: error?.message || String(error || 'Unknown error'),
    })
  }

  const metrics = () => ({
    requestId,
    totalLatencyMs: Date.now() - startedAt,
    stages,
  })

  return {
    requestId,
    startedAt,
    log,
    fail,
    metrics,
  }
}

export const withTimeout = async (promise, timeoutMs, message = DEFAULT_TIMEOUT_MESSAGE) => {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new PipelineTimeoutError(message)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}

export const timedStage = async (requestContext, stage, fn, details = {}) => {
  const startedAt = Date.now()
  requestContext?.log?.(`${stage}:start`, details)
  try {
    const result = await fn()
    requestContext?.log?.(`${stage}:complete`, {
      ...details,
      latencyMs: Date.now() - startedAt,
    })
    return result
  } catch (error) {
    requestContext?.fail?.(`${stage}:error`, error, {
      ...details,
      latencyMs: Date.now() - startedAt,
    })
    throw error
  }
}
