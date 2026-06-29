const getCurrentDateTime = () => {
  const now = new Date()
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  try {
    return { date, time, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  } catch {
    return { date, time, timezone: 'UTC' }
  }
}

export const buildDateTimeContext = () => {
  const { date, time, timezone } = getCurrentDateTime()
  return `Current Date and Time\nDate: ${date}\nTime: ${time}\nTimezone: ${timezone}`
}

const SYSTEM_PROMPT = `You are the official AI Assistant for JEDDSpace.

{datetime_context}

Answer only using the supplied company data, conversation history, resolved entities, database context, and extracted uploaded-file contents.
If the requested information is unavailable, state that clearly.
Do not invent employees, contracts, jobs, leave requests, notifications, or documents.
Respect user authorization boundaries. If data is not present in the supplied context, say it is not available to you.
Do not claim to have read documents, images, or audio that were not processed into the prompt.
Explain what additional information is needed when you cannot answer.
Provide concise, factual, and professional responses.`

const formatEmployee = (employee) => {
  const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown employee'
  const lines = [name]

  if (employee.position) lines.push(`Position: ${employee.position}`)
  if (employee.department) lines.push(`Department: ${employee.department}`)
  if (employee.employee_type) lines.push(`Type: ${employee.employee_type}`)
  if (employee.employment_status) lines.push(`Status: ${employee.employment_status}`)

  return lines.join(' | ')
}

const formatJob = (job) => {
  const employeeName = job.employee
    ? `${job.employee.first_name || ''} ${job.employee.last_name || ''}`.trim()
    : 'Unassigned'

  return [
    `Job: ${job.destination || 'Unknown destination'}`,
    `Department: ${job.department || 'Unknown'}`,
    `Dates: ${job.start_date || 'Unknown'} to ${job.end_date || 'Unknown'}`,
    `Status: ${job.status || 'Unknown'}`,
    `Assigned To: ${employeeName}`,
  ].join(' | ')
}

const formatLeave = (leave) => {
  const employeeName = leave.employee
    ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
    : 'Unknown employee'

  return [
    `Employee: ${employeeName}`,
    `Leave Type: ${leave.type || 'Unknown'}`,
    `Dates: ${leave.start_date || 'Unknown'} to ${leave.end_date || 'Unknown'}`,
    `Reason: ${leave.reason || 'No reason provided'}`,
    `Status: ${leave.status || 'Unknown'}`,
  ].join(' | ')
}

const formatContract = (contract) => {
  const employeeName = contract.contractor
    ? `${contract.contractor.first_name || ''} ${contract.contractor.last_name || ''}`.trim()
    : 'Unknown contractor'

  return [
    `Contract: ${contract.contract_title || 'Untitled contract'}`,
    `Contractor: ${employeeName}`,
    `Dates: ${contract.start_date || 'Unknown'} to ${contract.end_date || 'Unknown'}`,
    `Status: ${contract.status || 'Unknown'}`,
    `Salary: ${contract.salary ?? 'Unknown'}`,
  ].join(' | ')
}

const formatNotification = (notification) => {
  return [
    `Title: ${notification.title || 'Untitled notification'}`,
    `Type: ${notification.type || 'Unknown'}`,
    `Priority: ${notification.priority || 'Normal'}`,
    `Read: ${notification.is_read ? 'Yes' : 'No'}`,
    notification.message ? `Message: ${notification.message}` : null,
  ].filter(Boolean).join(' | ')
}

const formatDocument = (document) => {
  const parts = [
    `Title: ${document.title || document.file_name || 'Untitled document'}`,
    `File: ${document.file_name || 'Unknown'}`,
    `Type: ${document.file_type || 'Unknown'}`,
  ]

  if (document.created_at) {
    parts.push(`Uploaded: ${new Date(document.created_at).toLocaleDateString()}`)
  }

  if (document.uploaded_by) {
    const uploaderName = document.employee
      ? `${document.employee.first_name || ''} ${document.employee.last_name || ''}`.trim()
      : `User ID: ${document.uploaded_by}`
    parts.push(`Uploaded By: ${uploaderName}`)
  }

  if (document.ai_summary) {
    parts.push(`Summary: ${document.ai_summary}`)
  }

  return parts.join(' | ')
}

const formatRecommendation = (recommendation) => {
  return [
    `Employee: ${recommendation.full_name || 'Unknown employee'}`,
    `Position: ${recommendation.position || 'Unknown'}`,
    `Department: ${recommendation.department || 'Unknown'}`,
    `Score: ${recommendation.score ?? 0}`,
    `Reasons: ${(recommendation.reasons || []).join(', ') || 'None'}`,
  ].join(' | ')
}

const formatOperations = (ops) => {
  const lines = [
    `Total Employees: ${ops.employees || 0}`,
    `Active Jobs: ${ops.active_jobs || 0}`,
    `Employees on Leave: ${ops.employees_on_leave || 0}`,
    `Contracts Expiring Soon: ${ops.expiring_contracts || 0}`,
    `Unread Notifications: ${ops.unread_notifications || 0}`,
    `Scheduling Conflicts: ${ops.scheduling_conflicts || 0}`,
  ]
  return lines.join('\n')
}

const formatChatLog = (log) => {
  if (log.prompt || log.response) {
    return [
      log.created_at ? `Date: ${new Date(log.created_at).toLocaleString()}` : null,
      log.intent ? `Intent: ${log.intent}` : null,
      log.prompt ? `User asked: ${log.prompt}` : null,
      log.response ? `Assistant answered: ${String(log.response).slice(0, 700)}` : null,
    ].filter(Boolean).join(' | ')
  }

  const typeMap = {
    weekly_leave_summary: 'Weekly Leave Summary',
    contract_summary: 'Contract Summary',
    notification_summary: 'Notification Summary',
    job_daily_summary: 'Daily Job Summary',
    employee_activity_summary: 'Employee Activity Summary',
  }
  const typeLabel = typeMap[log.reference_type] || log.reference_type
  return `[${typeLabel}] ${log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}`
}

const compactMessages = (messages = []) => {
  return messages
    .filter((message) => message?.role && message?.content && message.role !== 'system')
    .slice(-8)
    .map((message) => {
      const label = message.role === 'assistant' ? 'Assistant' : 'User'
      return `${label}: ${String(message.content).slice(0, 1200)}`
    })
    .join('\n')
}

const buildDataContext = ({ intent, data }) => {
  const contextParts = []

  if (intent === 'operations') {
    contextParts.push('Today\'s Operations Summary')
    contextParts.push(formatOperations(data.operations))
  } else if (intent === 'chat_logs') {
    contextParts.push('Previous AI Summaries')
    contextParts.push(...(data.logs || []).map(formatChatLog))
  } else if (intent === 'employee') {
    contextParts.push('Employees')
    contextParts.push(...(data.employees || []).map(formatEmployee))
  } else if (intent === 'job') {
    contextParts.push('Current Jobs')
    contextParts.push(...(data.jobs || []).map(formatJob))
  } else if (intent === 'leave') {
    contextParts.push('Approved Leave Requests')
    contextParts.push(...(data.leaves || []).map(formatLeave))
  } else if (intent === 'contract') {
    contextParts.push('Contracts')
    contextParts.push(...(data.contracts || []).map(formatContract))
  } else if (intent === 'recommendation') {
    contextParts.push('Recommended Workers')
    contextParts.push(...(data.recommendations || []).map(formatRecommendation))
  } else if (intent === 'notification') {
    contextParts.push('Notifications')
    contextParts.push(...(data.notifications || []).map(formatNotification))
  } else if (intent === 'document') {
    contextParts.push('Documents')
    contextParts.push(...(data.documents || []).map(formatDocument))
  } else {
    contextParts.push('Business Context')
    contextParts.push('Employees')
    contextParts.push(...(data.employees || []).map(formatEmployee))
    contextParts.push('')
    contextParts.push('Current Jobs')
    contextParts.push(...(data.jobs || []).map(formatJob))
    contextParts.push('')
    contextParts.push('Approved Leave Requests')
    contextParts.push(...(data.leaves || []).map(formatLeave))
    contextParts.push('')
    contextParts.push('Contracts')
    contextParts.push(...(data.contracts || []).map(formatContract))
    contextParts.push('')
    contextParts.push('Notifications')
    contextParts.push(...(data.notifications || []).map(formatNotification))
  }

  return contextParts.join('\n')
}

export const buildMessages = ({ intent, message, data, messages = [], attachmentContext = '', entityContext = '', warningContext = '', recentContext = null }) => {
  const databaseContext = buildDataContext({ intent, data }) || 'No relevant database records were loaded.'
  const conversationContext = compactMessages(messages)
  const dateTimeContext = buildDateTimeContext()
  const sections = [
    'Conversation',
    conversationContext || 'No prior conversation supplied.',
    '',
    'Database Context',
    databaseContext,
  ]

  if (entityContext) {
    sections.push('', 'Resolved Entities', entityContext)
  }

  if (warningContext) {
    sections.push('', 'Processing Notes', warningContext)
  }

  if (attachmentContext) {
    sections.push('', 'Uploaded Files', attachmentContext)
  }

  if (recentContext && Object.keys(recentContext).length > 0) {
    const recentContextLines = Object.entries(recentContext)
      .map(([type, value]) => `Recent ${type}: ${value}`)
      .join('\n')
    sections.push('', 'Recent Conversation Context', recentContextLines)
  }

  sections.push('', 'Question', message)

  const systemPrompt = SYSTEM_PROMPT.replace('{datetime_context}', dateTimeContext)

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: sections.join('\n') },
  ]
}

export const buildSystemContext = ({ intent, data, attachmentContext = '', messages = [], entityContext = '', warningContext = '', recentContext = null }) => {
  const context = buildDataContext({ intent, data })
  const conversationContext = compactMessages(messages)
  const dateTimeContext = buildDateTimeContext()
  const recentContextSection = recentContext && Object.keys(recentContext).length > 0
    ? `Recent Conversation Context\n${Object.entries(recentContext)
        .map(([type, value]) => `Recent ${type}: ${value}`)
        .join('\n')}`
    : null
  const fullContext = [
    conversationContext ? `Conversation Memory\n${conversationContext}` : null,
    `Database Context\n${context || 'No relevant database records were loaded.'}`,
    entityContext ? `Resolved Entities\n${entityContext}` : null,
    warningContext ? `Processing Notes\n${warningContext}` : null,
    attachmentContext ? `Uploaded Files\n${attachmentContext}` : null,
    recentContextSection,
  ].filter(Boolean).join('\n\n')

  const systemPrompt = SYSTEM_PROMPT.replace('{datetime_context}', dateTimeContext)
  return `${systemPrompt}\n\n${fullContext}`
}

export { SYSTEM_PROMPT }
