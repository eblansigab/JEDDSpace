import { employeeService } from './employeeService'
import { jobService } from './jobsService'
import { contractService } from './contractService'
import { notificationService } from './notificationService'
import { documentService } from './documentService'
import { supabaseClient } from '../supabase/supabaseClient'

const toReadableEmployee = (employee) => {
  const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown employee'
  const parts = [name]

  if (employee.position) parts.push(`Position: ${employee.position}`)
  if (employee.department) parts.push(`Department: ${employee.department}`)
  if (employee.employee_type) parts.push(`Type: ${employee.employee_type}`)
  if (employee.employment_status) parts.push(`Status: ${employee.employment_status}`)
  if (employee.role) parts.push(`Role: ${employee.role}`)

  return parts.join(' | ')
}

const toReadableJob = (job) => {
  const employeeName = job.employee
    ? `${job.employee.first_name || ''} ${job.employee.last_name || ''}`.trim()
    : `Employee ID ${job.employee_id || 'Unknown'}`

  return [
    `Destination: ${job.destination || 'Unknown'}`,
    `Assigned To: ${employeeName}`,
    `Start Date: ${job.start_date || 'Unknown'}`,
    `End Date: ${job.end_date || 'Unknown'}`,
    `Status: ${job.status || 'Unknown'}`,
  ].join(' | ')
}

const toReadableNotification = (item) => {
  return [
    `Title: ${item.title || 'Untitled'}`,
    `Type: ${item.type || 'Unknown'}`,
    `Priority: ${item.priority || 'Normal'}`,
  ].join(' | ')
}

const toReadableContract = (contract) => {
  const contractor = contract.contractor
    ? `${contract.contractor.first_name || ''} ${contract.contractor.last_name || ''}`.trim()
    : `Contractor ID ${contract.contractor || 'Unknown'}`

  return [
    `Title: ${contract.contract_title || 'Untitled contract'}`,
    `Contractor: ${contractor}`,
    `Start Date: ${contract.start_date || 'Unknown'}`,
    `End Date: ${contract.end_date || 'Unknown'}`,
    `Status: ${contract.status || 'Unknown'}`,
  ].join(' | ')
}

const classifyIntent = (prompt) => {
  const lower = String(prompt || '').toLowerCase()

  if (
    lower.includes('available') ||
    lower.includes('availability') ||
    lower.includes('who can') ||
    lower.includes('who is free') ||
    lower.includes('recommend')
  ) return 'availability'
  if (lower.includes('contract')) return 'contracts'
  if (lower.includes('notification') || lower.includes('unread')) return 'notifications'
  if (lower.includes('leave')) return 'leave'
  if (lower.includes('job') || lower.includes('assignment')) return 'jobs'
  if (lower.includes('employee') || lower.includes('worker')) return 'employees'
  return 'general'
}

const getApprovedLeaves = async () => {
  const { data, error } = await supabaseClient
    .from('leaveform')
    .select('leaveform_id, employee_id, start_date, end_date, reason, status, employee:employee_id ( first_name, last_name, position, department )')
    .eq('status', 'approved')
    .order('start_date', { ascending: true })

  if (error) throw error
  return data || []
}

const getUnreadNotifications = async () => {
  const notifications = await notificationService.getNotifications()
  return (notifications || []).filter((item) => !item.is_read)
}

const buildContext = async (prompt) => {
  const intent = classifyIntent(prompt)

  if (intent === 'availability') {
    const employees = await employeeService.getFieldWorkers()
    const jobs = await jobService.getAll()
    const leaves = await getApprovedLeaves()

    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following availability context to answer the question in natural language.',
      '',
      'Available workers context:',
      ...(employees || []).slice(0, 30).map(toReadableEmployee),
      '',
      'Job assignments context:',
      ...(jobs || []).slice(0, 30).map(toReadableJob),
      '',
      'Approved leave context:',
      ...(leaves || []).slice(0, 30).map((leave) => {
        const employeeName = leave.employee
          ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
          : `Employee ID ${leave.employee_id || 'Unknown'}`
        return `Employee: ${employeeName} | Start Date: ${leave.start_date || 'Unknown'} | End Date: ${leave.end_date || 'Unknown'} | Reason: ${leave.reason || 'No reason provided'}`
      }),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  if (intent === 'contracts') {
    const contracts = await contractService.getAllContracts()
    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following contract context to answer the question in natural language.',
      '',
      'Current contracts:',
      ...(contracts || []).slice(0, 20).map(toReadableContract),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  if (intent === 'notifications') {
    const notifications = String(prompt || '').toLowerCase().includes('unread')
      ? await getUnreadNotifications()
      : await notificationService.getNotifications()
    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following notification context to answer the question in natural language.',
      '',
      String(prompt || '').toLowerCase().includes('unread') ? 'Unread notifications:' : 'Current notifications:',
      ...(notifications || []).slice(0, 20).map(toReadableNotification),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  if (intent === 'leave') {
    const leaves = await getApprovedLeaves()
    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following approved leave context to answer the question in natural language.',
      '',
      'Approved leaves:',
      ...(leaves || []).slice(0, 20).map((leave) => {
        const employeeName = leave.employee
          ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
          : `Employee ID ${leave.employee_id || 'Unknown'}`
        return `Employee: ${employeeName} | Start Date: ${leave.start_date || 'Unknown'} | End Date: ${leave.end_date || 'Unknown'} | Reason: ${leave.reason || 'No reason provided'}`
      }),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  if (intent === 'jobs') {
    const jobs = await jobService.getAll()
    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following job context to answer the question in natural language.',
      '',
      'Current jobs:',
      ...(jobs || []).slice(0, 30).map(toReadableJob),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  if (intent === 'employees') {
    const { data: employees, error } = await supabaseClient
      .from('employee')
      .select('employee_id, first_name, last_name, position, department, employee_type, role, employment_status, is_archived')
      .order('first_name')

    if (error) throw error

    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following employee context to answer the question in natural language.',
      '',
      'Current employees:',
      ...(employees || []).slice(0, 30).map(toReadableEmployee),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  if (intent === 'general' && prompt.toLowerCase().includes('document')) {
    const documents = await documentService.getAllDocuments()
    const documentsWithSummaries = await Promise.all(
      (documents || []).slice(0, 5).map(async (doc) => {
        const summary = await documentService.getDocumentSummary(doc.document_id)
        return { ...doc, ai_summary: summary?.summary || null }
      })
    )

    return [
      'You are the AI assistant for JEDDSpace.',
      'Use the following document context to answer the question in natural language.',
      '',
      'Documents:',
      ...(documentsWithSummaries || []).map((doc) => {
        const summaryText = doc.ai_summary ? `Summary: ${doc.ai_summary}` : 'No summary available'
        return `${doc.title || doc.file_name || 'Untitled'} | ${summaryText}`
      }),
      '',
      `Question: ${prompt}`
    ].join('\n')
  }

  const employees = await employeeService.getFieldWorkers()
  const jobs = await jobService.getAll()

  return [
    'You are the AI assistant for JEDDSpace.',
    'Use the following business context to answer the question in natural language.',
    '',
    'Current employees:',
    ...(employees || []).slice(0, 20).map(toReadableEmployee),
    '',
    'Current jobs:',
    ...(jobs || []).slice(0, 20).map(toReadableJob),
    '',
    `Question: ${prompt}`
  ].join('\n')
}

export const aiPromptBuilder = {
  async buildPrompt(prompt) {
    return await buildContext(prompt)
  },

  async buildSummaryPrompt({ referenceType, rawDataSnapshot }) {
    return [
      'You are the AI assistant for JEDDSpace.',
      `Summarize the following ${referenceType} data for management in clear, concise language.`,
      '',
      rawDataSnapshot,
      ''
    ].join('\n')
  }
}
