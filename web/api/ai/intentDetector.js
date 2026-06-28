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
