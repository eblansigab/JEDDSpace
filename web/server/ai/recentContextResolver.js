const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const CURRENT_PATTERNS = [
  { type: 'employee', patterns: [/current\s+employee/i, /current\s+worker/i, /current\s+staff/i] },
  { type: 'contract', patterns: [/current\s+contract/i, /current\s+agreement/i] },
  { type: 'job', patterns: [/current\s+job/i, /current\s+assignment/i, /current\s+schedule/i] },
  { type: 'leave', patterns: [/current\s+leave/i, /current\s+absence/i, /current\s+vacation/i] },
  { type: 'document', patterns: [/current\s+document/i, /current\s+file/i, /current\s+pdf/i] },
  { type: 'inbox', patterns: [/current\s+inbox/i, /current\s+message/i, /latest\s+message/i, /latest\s+conversation/i] },
]

const extractRecentEntity = (messages = [], entityType) => {
  const recent = messages.slice(-20)
  for (let i = recent.length - 1; i >= 0; i--) {
    const content = normalize(recent[i]?.content || '')
    if (!content) continue

    if (entityType === 'employee') {
      const nameMatch = content.match(/(?:employee|worker|staff)\s+(?:named|called|is|name[ds]?)\s+([a-z]+(?:\s+[a-z]+)?)/i)
      if (nameMatch) return nameMatch[1].trim()
    }

    if (entityType === 'document') {
      const docMatch = content.match(/(?:document|file|pdf|upload)\s+(?:named|called|is|title[ds]?)\s+["']?([^"'\n.]+)["']?/i)
      if (docMatch) return docMatch[1].trim()
    }

    if (entityType === 'job') {
      const jobMatch = content.match(/(?:job|assignment)\s+(?:to|at|for)\s+([a-z0-9\s]+?)(?:\s+on|\s+from|\s+starting|\s+with|$)/i)
      if (jobMatch) return jobMatch[1].trim()
    }

    if (entityType === 'contract') {
      const contractMatch = content.match(/(?:contract|agreement)\s+(?:for|with|titled)\s+["']?([^"'\n.]+)["']?/i)
      if (contractMatch) return contractMatch[1].trim()
    }

    if (entityType === 'leave') {
      const leaveMatch = content.match(/(?:leave|absence|vacation)\s+(?:for|by|of)\s+["']?([^"'\n.]+)["']?/i)
      if (leaveMatch) return leaveMatch[1].trim()
    }

    if (entityType === 'inbox') {
      const senderMatch = content.match(/(?:from|sent by)\s+([a-z]+(?:\s+[a-z]+)?)/i)
      if (senderMatch) return senderMatch[1].trim()
      const whoMatch = content.match(/who\s+(?:messaged|emailed|sent)\s+(.+?)(?:\s+yesterday|\s+today|\s+this\s+week|\s+last\s+week)?$/i)
      if (whoMatch) return whoMatch[1].trim()
    }
  }

  return null
}

export const resolveRecentContext = ({ message, messages = [] }) => {
  const text = normalize(message)
  const results = {}

  for (const { type, patterns } of CURRENT_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) {
      const extracted = extractRecentEntity(messages, type)
      if (extracted) {
        results[type] = extracted
      }
    }
  }

  return results
}

export const hasCurrentEntityReference = (message) => {
  const text = normalize(message)
  return CURRENT_PATTERNS.some(({ patterns }) => patterns.some((pattern) => pattern.test(text)))
}
