import { resolveDocumentReference } from './documentResolver.js'

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const isAdmin = (viewer) => Boolean(viewer?.isAdmin)
const viewerEmployeeId = (viewer) => viewer?.employee?.employee_id ?? null

const hasFollowUpReference = (message) => {
  const text = normalize(message)
  return [
    'it',
    'that',
    'this',
    'them',
    'that employee',
    'that contract',
    'that job',
    'that leave',
    'tell me more',
    'summarize it',
    'explain it',
  ].some((keyword) => text.includes(keyword))
}

const recentConversationText = (messages = []) => {
  return normalize(
    messages
      .slice(-10)
      .map((message) => message?.content)
      .filter(Boolean)
      .join('\n')
  )
}

const scopeEmployeeIdQuery = (query, viewer, column = 'employee_id') => {
  if (isAdmin(viewer)) return query
  const employeeId = viewerEmployeeId(viewer)
  return employeeId ? query.eq(column, employeeId) : query.limit(0)
}

const maybeSingle = async (query) => {
  const { data, error } = await query.limit(1).maybeSingle()
  if (error) return null
  return data || null
}

const resolved = (type, reason, value, confidence = 0.8, alternatives = []) => ({
  type,
  reason,
  value,
  confidence,
  alternatives,
})

const resolveEmployee = async ({ client, viewer, message, messages }) => {
  const text = normalize(`${message}\n${recentConversationText(messages)}`)
  if (!text.includes('employee') && !text.includes('worker') && !text.includes('staff')) return null

  let query = client
    .from('employee')
    .select('employee_id, first_name, last_name, position, department, role, employment_status')
    .order('first_name')

  query = scopeEmployeeIdQuery(query, viewer)
  const { data, error } = await query.limit(50)
  if (error) return null

  const match = (data || []).find((employee) => {
    const fullName = normalize(`${employee.first_name || ''} ${employee.last_name || ''}`)
    return fullName && text.includes(fullName)
  })

  if (match) return resolved('employee', 'conversation_or_message_match', match, 0.95)
  if (hasFollowUpReference(message) && data?.[0]) return resolved('employee', 'follow_up_reference', data[0], 0.7)
  return null
}

const resolveContract = async ({ client, viewer, message, messages }) => {
  const text = normalize(`${message}\n${recentConversationText(messages)}`)
  if (!text.includes('contract') && !text.includes('agreement')) return null

  let query = client
    .from('contracts')
    .select(`
      contracts_id,
      contract_title,
      start_date,
      end_date,
      salary,
      status,
      created_at,
      contractor,
      contractor_employee:contractor (
        first_name,
        last_name,
        position,
        department
      )
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin(viewer)) {
    const employeeId = viewerEmployeeId(viewer)
    query = employeeId ? query.eq('contractor', employeeId) : query.limit(0)
  }

  if (text.includes('latest') || text.includes('recent') || hasFollowUpReference(message)) {
    const latest = await maybeSingle(query)
    return latest ? resolved('contract', 'latest_or_follow_up_reference', latest, text.includes('latest') || text.includes('recent') ? 0.9 : 0.68) : null
  }

  const { data, error } = await query.limit(25)
  if (error) return null

  const match = (data || []).find((contract) => {
    const title = normalize(contract.contract_title)
    return title && text.includes(title)
  })

  return match ? resolved('contract', 'title_match', match, 0.94) : null
}

const resolveJob = async ({ client, viewer, message, messages }) => {
  const text = normalize(`${message}\n${recentConversationText(messages)}`)
  if (!text.includes('job') && !text.includes('assignment') && !text.includes('schedule')) return null

  let query = client
    .from('job')
    .select('job_id, employee_id, department, status, destination, start_date, end_date, notes, created_at')
    .order('created_at', { ascending: false })

  query = scopeEmployeeIdQuery(query, viewer)

  const job = await maybeSingle(query)
  return job ? resolved('job', 'latest_or_relevant_job', job, text.includes('latest') || text.includes('current') ? 0.85 : 0.65) : null
}

const resolveLeave = async ({ client, viewer, message, messages }) => {
  const text = normalize(`${message}\n${recentConversationText(messages)}`)
  if (!text.includes('leave') && !text.includes('absence') && !text.includes('vacation')) return null

  let query = client
    .from('leaveform')
    .select('leaveform_id, employee_id, start_date, end_date, type, reason, status, created_at')
    .order('created_at', { ascending: false })

  query = scopeEmployeeIdQuery(query, viewer)

  const leave = await maybeSingle(query)
  return leave ? resolved('leave', 'latest_or_relevant_leave', leave, text.includes('latest') || text.includes('current') ? 0.85 : 0.65) : null
}

const resolveRecommendation = async ({ message, messages }) => {
  const text = normalize(`${message}\n${recentConversationText(messages)}`)
  if (!text.includes('recommend')) return null
  return {
    ...resolved('recommendation', 'recommendation_topic', { topic: 'employee assignment recommendation' }, 0.9),
  }
}

export const resolveEntities = async ({ client, viewer, message, messages = [], attachments = [] }) => {
  const [document, employee, contract, job, leave, recommendation] = await Promise.all([
    resolveDocumentReference({ client, viewer, message, messages, attachments }),
    resolveEmployee({ client, viewer, message, messages }),
    resolveContract({ client, viewer, message, messages }),
    resolveJob({ client, viewer, message, messages }),
    resolveLeave({ client, viewer, message, messages }),
    resolveRecommendation({ message, messages }),
  ])

  return {
    document,
    employee,
    contract,
    job,
    leave,
    recommendation,
  }
}

const isLowConfidence = (entity) => {
  return (entity?.value || entity?.document) && Number(entity.confidence ?? 1) < 0.75
}

export const getLowConfidenceEntities = (entities = {}) => {
  return Object.values(entities).filter(isLowConfidence)
}

export const formatResolvedEntities = (entities = {}) => {
  const lines = []

  if (entities.document?.document) {
    lines.push(`Document: ${entities.document.document.title || entities.document.document.file_name || entities.document.document.document_id} (${entities.document.reason}, confidence ${entities.document.confidence ?? 0.9})`)
  }
  if (entities.employee?.value) {
    const employee = entities.employee.value
    lines.push(`Employee: ${employee.first_name || ''} ${employee.last_name || ''} | ${employee.position || 'Unknown position'} | ${employee.department || 'Unknown department'} (${entities.employee.reason}, confidence ${entities.employee.confidence ?? 0.8})`)
  }
  if (entities.contract?.value) {
    const contract = entities.contract.value
    lines.push(`Contract: ${contract.contract_title || contract.contracts_id} | Status: ${contract.status || 'Unknown'} (${entities.contract.reason}, confidence ${entities.contract.confidence ?? 0.8})`)
  }
  if (entities.job?.value) {
    const job = entities.job.value
    lines.push(`Job: ${job.destination || job.job_id} | Status: ${job.status || 'Unknown'} (${entities.job.reason}, confidence ${entities.job.confidence ?? 0.8})`)
  }
  if (entities.leave?.value) {
    const leave = entities.leave.value
    lines.push(`Leave: ${leave.type || leave.leaveform_id} | ${leave.start_date || 'Unknown'} to ${leave.end_date || 'Unknown'} | Status: ${leave.status || 'Unknown'} (${entities.leave.reason}, confidence ${entities.leave.confidence ?? 0.8})`)
  }
  if (entities.recommendation?.value) {
    lines.push(`Recommendation Topic: ${entities.recommendation.value.topic} (${entities.recommendation.reason}, confidence ${entities.recommendation.confidence ?? 0.8})`)
  }

  return lines.join('\n')
}
