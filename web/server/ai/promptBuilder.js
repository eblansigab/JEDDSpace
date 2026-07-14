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

Answer only questions related to JEDDTech operations: employees, documents, contracts, leave requests, notifications, announcements, inbox messages, jobs, company procedures, recommendations, AI analytics, audit logs, blockchain verification, and uploaded files. For those topics, use only the provided context. If the information is unavailable, state that clearly.
Do not answer general knowledge, homework, politics, religion, medical advice, programming tutorials, entertainment, games, personal advice, NSFW topics, illegal content, or random calculations.
Do not invent employees, contracts, jobs, leave requests, notifications, or documents.
Respect user authorization boundaries. If data is not present in the supplied context, say it is not available to you.
Do not claim to have read documents, images, or audio that were not processed into the prompt.
Explain what additional information is needed when you cannot answer.
Provide concise, factual, and professional responses.
When summarizing lists or records, prefer readable tables over raw CSV-style lines. Keep tables compact and scannable.`

const formatEmployee = (employee) => {
  const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown employee'

  return {
    Name: name,
    Position: employee.position || 'Unknown',
    Department: employee.department || 'Unknown',
    Type: employee.employee_type || 'Unknown',
    Status: employee.employment_status || 'Unknown',
  }
}

const formatJob = (job) => {
  const employeeName = job.employee
    ? `${job.employee.first_name || ''} ${job.employee.last_name || ''}`.trim()
    : 'Unassigned'

  return {
    Destination: job.destination || 'Unknown destination',
    Department: job.department || 'Unknown',
    Dates: `${job.start_date || 'Unknown'} to ${job.end_date || 'Unknown'}`,
    Status: job.status || 'Unknown',
    AssignedTo: employeeName,
  }
}

const formatLeave = (leave) => {
  const employeeName = leave.employee
    ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
    : 'Unknown employee'

  return {
    Employee: employeeName,
    Type: leave.type || 'Unknown',
    Dates: `${leave.start_date || 'Unknown'} to ${leave.end_date || 'Unknown'}`,
    Reason: leave.reason || 'No reason provided',
    Status: leave.status || 'Unknown',
  }
}

const formatContract = (contract) => {
  const employeeName = contract.contractor
    ? `${contract.contractor.first_name || ''} ${contract.contractor.last_name || ''}`.trim()
    : 'Unknown contractor'

  return {
    Contract: contract.contract_title || 'Untitled contract',
    Contractor: employeeName,
    Dates: `${contract.start_date || 'Unknown'} to ${contract.end_date || 'Unknown'}`,
    Status: contract.status || 'Unknown',
    Salary: contract.salary ?? 'Unknown',
  }
}

const formatNotification = (notification) => {
  return {
    Title: notification.title || 'Untitled notification',
    Type: notification.type || 'Unknown',
    Priority: notification.priority || 'Normal',
    Read: notification.is_read ? 'Yes' : 'No',
    Message: String(notification.message || '').slice(0, 180),
  }
}

const formatDocument = (document) => {
  const parts = {
    Title: document.title || document.file_name || 'Untitled document',
    File: document.file_name || 'Unknown',
    Type: document.file_type || 'Unknown',
  }

  if (document.created_at) {
    parts.Uploaded = new Date(document.created_at).toLocaleDateString()
  }

  if (document.uploaded_by) {
    const uploaderName = document.employee
      ? `${document.employee.first_name || ''} ${document.employee.last_name || ''}`.trim()
      : `User ID: ${document.uploaded_by}`
    parts['Uploaded By'] = uploaderName
  }

  if (document.ai_summary) {
    parts.Summary = document.ai_summary
  }

  return parts
}

const formatMessage = (msg) => {
  const senderName = msg.employee
    ? `${msg.employee.first_name || ''} ${msg.employee.last_name || ''}`.trim()
    : 'Unknown sender'

  const recipientName = msg.recipient
    ? `${msg.recipient.first_name || ''} ${msg.recipient.last_name || ''}`.trim()
    : msg.recipient_email || 'Unknown'

  return {
    From: senderName,
    Position: msg.employee?.position || '',
    Department: msg.employee?.department || '',
    To: recipientName,
    Subject: msg.subject || 'No Subject',
    Date: msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Unknown',
    Read: msg.is_read ? 'Yes' : 'No',
    Body: msg.message_body || '',
  }
}

const formatRecommendation = (recommendation) => {
  return {
    Employee: recommendation.full_name || 'Unknown employee',
    Position: recommendation.position || 'Unknown',
    Department: recommendation.department || 'Unknown',
    Score: recommendation.score ?? 0,
    Reasons: (recommendation.reasons || []).join(', ') || 'None',
  }
}

const buildMarkdownTable = (rows = []) => {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => String(value ?? '').replace(/\|/g, '\\|')
  const headerRow = `| ${headers.map(escape).join(' | ')} |`
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
  const dataRows = rows.map((row) => `| ${headers.map((key) => escape(row[key])).join(' | ')} |`)
  return [headerRow, separatorRow, ...dataRows].join('\n')
}

const buildInboxSummary = (messages, scope, viewerEmail, targetEmployee = null) => {
  const count = messages.length
  const unreadCount = messages.filter((m) => !m.is_read).length
  const latest = messages[0]

  const lines = ['Inbox Summary']

  if (scope === 'all') {
    lines.push('Scope: All company emails (administrator view)')
  } else if (scope === 'employee' && targetEmployee) {
    lines.push(`Scope: ${targetEmployee.first_name} ${targetEmployee.last_name}'s inbox`)
  } else {
    lines.push(`Scope: Your inbox`)
  }

  lines.push(`Total messages: ${count}`)
  lines.push(`Unread: ${unreadCount}`)

  if (latest) {
    const senderName = latest.employee
      ? `${latest.employee.first_name || ''} ${latest.employee.last_name || ''}`.trim()
      : 'Unknown sender'
    lines.push(`Latest message: From ${senderName} on ${latest.created_at ? new Date(latest.created_at).toLocaleString() : 'Unknown'}`)
    lines.push(`Subject: ${latest.subject || 'No Subject'}`)
  }

  return lines.join('\n')
}

const formatRecommendation = (recommendation) => {
  return {
    Employee: recommendation.full_name || 'Unknown employee',
    Position: recommendation.position || 'Unknown',
    Department: recommendation.department || 'Unknown',
    Score: recommendation.score ?? 0,
    Reasons: (recommendation.reasons || []).join(', ') || 'None',
  }
}

const formatOperations = (ops) => {
  return {
    'Total Employees': ops.employees || 0,
    'Active Jobs': ops.active_jobs || 0,
    'Employees on Leave': ops.employees_on_leave || 0,
    'Contracts Expiring Soon': ops.expiring_contracts || 0,
    'Unread Notifications': ops.unread_notifications || 0,
    'Scheduling Conflicts': ops.scheduling_conflicts || 0,
  }
}

const formatChatLog = (log) => {
  if (log.prompt || log.response) {
    return {
      Date: log.created_at ? new Date(log.created_at).toLocaleString() : '',
      Intent: log.intent || '',
      'User asked': log.prompt || '',
      'Assistant answered': String(log.response || '').slice(0, 700),
    }
  }

  const typeMap = {
    weekly_leave_summary: 'Weekly Leave Summary',
    contract_summary: 'Contract Summary',
    notification_summary: 'Notification Summary',
    job_daily_summary: 'Daily Job Summary',
    employee_activity_summary: 'Employee Activity Summary',
  }
  const typeLabel = typeMap[log.reference_type] || log.reference_type
  return {
    Type: typeLabel,
    Date: log.created_at ? new Date(log.created_at).toLocaleDateString() : '',
  }
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

const buildDataContext = ({ intent, data = {} }) => {
  const contextParts = []

  if (intent === 'operations') {
    contextParts.push('Today\'s Operations Summary')
    const ops = data.operations || {}
    const row = {
      'Total Employees': ops.employees || 0,
      'Active Jobs': ops.active_jobs || 0,
      'Employees on Leave': ops.employees_on_leave || 0,
      'Contracts Expiring Soon': ops.expiring_contracts || 0,
      'Unread Notifications': ops.unread_notifications || 0,
      'Scheduling Conflicts': ops.scheduling_conflicts || 0,
    }
    contextParts.push(buildMarkdownTable([row]))
  } else if (intent === 'chat_logs') {
    contextParts.push('Previous AI Summaries')
    const rows = (data.logs || []).map(formatChatLog).filter(Boolean)
    if (rows.length) {
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No previous AI summaries available.')
    }
  } else if (intent === 'employee') {
    const rows = (data.employees || []).map(formatEmployee).filter(Boolean)
    if (rows.length) {
      contextParts.push('Employees')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No employees found.')
    }
  } else if (intent === 'job') {
    const rows = (data.jobs || []).map(formatJob).filter(Boolean)
    if (rows.length) {
      contextParts.push('Current Jobs')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No jobs found.')
    }
  } else if (intent === 'leave') {
    const rows = (data.leaves || []).map(formatLeave).filter(Boolean)
    if (rows.length) {
      contextParts.push('Approved Leave Requests')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No approved leave requests found.')
    }
  } else if (intent === 'contract') {
    const rows = (data.contracts || []).map(formatContract).filter(Boolean)
    if (rows.length) {
      contextParts.push('Contracts')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No contracts found.')
    }
  } else if (intent === 'recommendation') {
    const rows = (data.recommendations || []).map(formatRecommendation).filter(Boolean)
    if (rows.length) {
      contextParts.push('Recommended Workers')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No recommendations available.')
    }
  } else if (intent === 'notification') {
    const rows = (data.notifications || []).map(formatNotification).filter(Boolean)
    if (rows.length) {
      contextParts.push('Notifications')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No notifications found.')
    }
  } else if (intent === 'document') {
    const rows = (data.documents || []).map(formatDocument).filter(Boolean)
    if (rows.length) {
      contextParts.push('Documents')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No documents found.')
    }
  } else if (intent === 'inbox') {
    const summary = buildInboxSummary(data.messages, data.inboxScope, data.viewerEmail, data.targetEmployee)
    contextParts.push(summary)
    contextParts.push('')
    const rows = (data.messages || []).map(formatMessage).filter(Boolean)
    if (rows.length) {
      contextParts.push('Messages')
      contextParts.push(buildMarkdownTable(rows))
    } else {
      contextParts.push('No messages found.')
    }
  } else {
    const employeeRows = (data.employees || []).map(formatEmployee).filter(Boolean)
    const jobRows = (data.jobs || []).map(formatJob).filter(Boolean)
    const leaveRows = (data.leaves || []).map(formatLeave).filter(Boolean)
    const contractRows = (data.contracts || []).map(formatContract).filter(Boolean)
    const notificationRows = (data.notifications || []).map(formatNotification).filter(Boolean)

    contextParts.push('Business Context')
    if (employeeRows.length) {
      contextParts.push('Employees')
      contextParts.push(buildMarkdownTable(employeeRows))
    }
    contextParts.push('')
    if (jobRows.length) {
      contextParts.push('Current Jobs')
      contextParts.push(buildMarkdownTable(jobRows))
    }
    contextParts.push('')
    if (leaveRows.length) {
      contextParts.push('Approved Leave Requests')
      contextParts.push(buildMarkdownTable(leaveRows))
    }
    contextParts.push('')
    if (contractRows.length) {
      contextParts.push('Contracts')
      contextParts.push(buildMarkdownTable(contractRows))
    }
    contextParts.push('')
    if (notificationRows.length) {
      contextParts.push('Notifications')
      contextParts.push(buildMarkdownTable(notificationRows))
    }
  }

  return contextParts.join('\n')
}

export const buildMessages = ({ intent, message, data, messages = [], attachmentContext = '', entityContext = '', warningContext = '', recentContext = null, generalKnowledge = false, viewer = null }) => {
  const dateTimeContext = buildDateTimeContext()
  const conversationContext = compactMessages(messages)

  let systemPrompt = SYSTEM_PROMPT.replace('{datetime_context}', dateTimeContext)
  if (generalKnowledge) {
    systemPrompt = `You are the official AI Assistant for JEDDSpace.\n\n${dateTimeContext}\n\nAnswer this question using your general knowledge. For JEDDSpace-specific information (employees, contracts, jobs, leave requests, notifications, uploaded documents), answer only from the provided context. If the information is unavailable, state that clearly.`
  }

  if (viewer?.employee?.first_name || viewer?.employee?.last_name) {
    const userName = `${viewer.employee.first_name || ''} ${viewer.employee.last_name || ''}`.trim()
    systemPrompt += `\n\nYou are speaking with ${userName}.`
  }

  const databaseContext = generalKnowledge ? '' : (buildDataContext({ intent, data }) || 'No relevant database records were loaded.')
  const sections = [
    conversationContext || 'No prior conversation supplied.',
  ]

  if (!generalKnowledge) {
    sections.push('', 'Database Context', databaseContext)
  }

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

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: sections.join('\n') },
  ]
}

export const buildSystemContext = ({ intent, data, attachmentContext = '', messages = [], entityContext = '', warningContext = '', recentContext = null, generalKnowledge = false, viewer = null }) => {
  const dateTimeContext = buildDateTimeContext()
  let systemPrompt = SYSTEM_PROMPT.replace('{datetime_context}', dateTimeContext)
  if (generalKnowledge) {
    systemPrompt = `You are the official AI Assistant for JEDDSpace.\n\n${dateTimeContext}\n\nAnswer this question using your general knowledge. For JEDDSpace-specific information (employees, contracts, jobs, leave requests, notifications, uploaded documents), answer only from the provided context. If the information is unavailable, state that clearly.`
  }

  if (viewer?.employee?.first_name || viewer?.employee?.last_name) {
    const userName = `${viewer.employee.first_name || ''} ${viewer.employee.last_name || ''}`.trim()
    systemPrompt += `\n\nYou are speaking with ${userName}.`
  }

  const conversationContext = compactMessages(messages)
  const recentContextSection = recentContext && Object.keys(recentContext).length > 0
    ? `Recent Conversation Context\n${Object.entries(recentContext)
        .map(([type, value]) => `Recent ${type}: ${value}`)
        .join('\n')}`
    : null
  const context = generalKnowledge ? '' : (buildDataContext({ intent, data }) || 'No relevant database records were loaded.')
  const fullContext = [
    conversationContext ? `Conversation Memory\n${conversationContext}` : null,
    generalKnowledge ? null : `Database Context\n${context}`,
    entityContext ? `Resolved Entities\n${entityContext}` : null,
    warningContext ? `Processing Notes\n${warningContext}` : null,
    attachmentContext ? `Uploaded Files\n${attachmentContext}` : null,
    recentContextSection,
  ].filter(Boolean).join('\n\n')

  return `${systemPrompt}\n\n${fullContext}`
}

export { SYSTEM_PROMPT }
