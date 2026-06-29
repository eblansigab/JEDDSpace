const normalize = (value) => String(value || '').trim().toLowerCase()

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword))

export const detectIntent = (message) => {
  const text = normalize(message)

  if (includesAny(text, ['chat', 'log', 'logs', 'previous', 'history', 'past'])) {
    return 'chat_logs'
  }

  if (
    includesAny(text, [
      'recommendation',
      'recommendations',
      'recommended',
      'best worker',
      'best employee',
      'why was',
      'why is this person',
      'assignment window',
    ])
  ) {
    return 'recommendation'
  }

  if (
    includesAny(text, [
      'document',
      'documents',
      'uploaded',
      'upload',
      'file',
      'pdf',
      'handbook',
      'screenshot',
      'image',
      'picture',
      'photo',
      'tell me more',
      'summarize it',
      'explain it',
    ])
  ) {
    return 'document'
  }

  if (
    includesAny(text, [
      'contract',
      'contracts',
      'agreement',
      'contract summary',
    ])
  ) {
    return 'contract'
  }

  if (
    includesAny(text, [
      'leave',
      'approved leave',
      'employees on leave',
      'on leave',
      'vacation',
      'absence',
    ])
  ) {
    return 'leave'
  }

  if (
    includesAny(text, [
      'job',
      'jobs',
      'assignment',
      'assignments',
      'today\'s jobs',
      'current jobs',
      'schedule',
    ])
  ) {
    return 'job'
  }

  if (
    includesAny(text, [
      'employee',
      'employees',
      'worker',
      'workers',
      'staff',
      'available',
      'availability',
      'who can',
      'who is available',
      'available workers',
    ])
  ) {
    return 'employee'
  }

  if (
    includesAny(text, [
      'unread notification',
      'unread notifications',
      'notification',
      'notifications',
      'announcement',
      'alerts',
      'alert',
    ])
  ) {
    return 'notification'
  }

  if (includesAny(text, ['operations', 'operation', 'how are', 'status', 'overview', 'today', 'dashboard'])) {
    return 'operations'
  }

  return 'general'
}

export const isGeneralKnowledgeQuestion = (message) => {
  const text = String(message || '').trim().toLowerCase()

  const hasCompanyKeyword = [
    'employee', 'worker', 'staff', 'contract', 'agreement', 'job', 'assignment',
    'leave', 'absence', 'vacation', 'document', 'file', 'upload', 'pdf',
    'notification', 'alert', 'recommendation', 'operation', 'status', 'overview',
    'dashboard', 'today', 'schedule', 'department', 'position',
  ].some((keyword) => text.includes(keyword))

  if (hasCompanyKeyword) return false

  const questionPatterns = [
    /^(what is|what are|what was|what were)\s/i,
    /^(who is|who are|who was|who were)\s/i,
    /^(how does|how do|how did|how is|how are)\s/i,
    /^(why does|why do|why did|why is|why are)\s/i,
    /^(when did|when does|when do|when is|when are)\s/i,
    /^(where is|where are|where was|where were)\s/i,
    /^(define|explain|describe|tell me about)\s/i,
    /^(can you explain|do you know|do you know about)\s/i,
    /\b(?:what|who|how|why|when|where)\s+(?:is|are|was|were|does|do|did)\s/i,
  ]

  return questionPatterns.some((pattern) => pattern.test(text))
}
