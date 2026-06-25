const SYSTEM_PROMPT = `You are the JEDDSpace AI Assistant.

Answer only using the supplied company data.
If the requested information is unavailable, state that clearly.
Do not invent employees, contracts, jobs, leave requests, or notifications.
Provide concise and professional responses.`

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

const formatRecommendation = (recommendation) => {
  return [
    `Employee: ${recommendation.full_name || 'Unknown employee'}`,
    `Position: ${recommendation.position || 'Unknown'}`,
    `Department: ${recommendation.department || 'Unknown'}`,
    `Score: ${recommendation.score ?? 0}`,
    `Reasons: ${(recommendation.reasons || []).join(', ') || 'None'}`,
  ].join(' | ')
}

const buildUserContext = ({ intent, message, data }) => {
  if (intent === 'employee') {
    return [
      'Employees',
      ...(data.employees || []).map(formatEmployee),
      '',
      `Question: ${message}`,
    ].join('\n')
  }

  if (intent === 'job') {
    return [
      'Current Jobs',
      ...(data.jobs || []).map(formatJob),
      '',
      `Question: ${message}`,
    ].join('\n')
  }

  if (intent === 'leave') {
    return [
      'Approved Leave Requests',
      ...(data.leaves || []).map(formatLeave),
      '',
      `Question: ${message}`,
    ].join('\n')
  }

  if (intent === 'contract') {
    return [
      'Contracts',
      ...(data.contracts || []).map(formatContract),
      '',
      `Question: ${message}`,
    ].join('\n')
  }

  if (intent === 'recommendation') {
    return [
      'Recommended Workers',
      ...(data.recommendations || []).map(formatRecommendation),
      '',
      `Question: ${message}`,
    ].join('\n')
  }

  if (intent === 'notification') {
    return [
      'Notifications',
      ...(data.notifications || []).map(formatNotification),
      '',
      `Question: ${message}`,
    ].join('\n')
  }

  return [
    'Business Context',
    'Employees',
    ...(data.employees || []).map(formatEmployee),
    '',
    'Current Jobs',
    ...(data.jobs || []).map(formatJob),
    '',
    'Approved Leave Requests',
    ...(data.leaves || []).map(formatLeave),
    '',
    'Contracts',
    ...(data.contracts || []).map(formatContract),
    '',
    'Notifications',
    ...(data.notifications || []).map(formatNotification),
    '',
    `Question: ${message}`,
  ].join('\n')
}

export const buildMessages = ({ intent, message, data }) => {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserContext({ intent, message, data }) },
  ]
}

export { SYSTEM_PROMPT }
