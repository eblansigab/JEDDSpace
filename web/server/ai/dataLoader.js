import { getSupabaseServerClient } from './supabaseClient.js'
import { detectInboxScope } from './intentDetector.js'

const EMPLOYEE_SELECT = 'employee_id, first_name, last_name, position, department, employee_type, employment_status, is_archived, role'
const JOB_SELECT = `
  job_id,
  employee_id,
  department,
  status,
  destination,
  start_date,
  end_date,
  created_at,
  notes,
  employee:employee_id (
    first_name,
    last_name,
    position,
    department
  )
`
const LEAVE_SELECT = `
  leaveform_id,
  employee_id,
  start_date,
  end_date,
  type,
  reason,
  status,
  created_at,
  employee:employee_id (
    first_name,
    last_name,
    position,
    department
  )
`
const CONTRACT_SELECT = `
  contracts_id,
  contract_title,
  start_date,
  end_date,
  salary,
  status,
  created_at,
  contractor:contractor (
    employee_id,
    first_name,
    last_name,
    position,
    department
  )
`
const NOTIFICATION_SELECT = 'notifications_id, title, message, type, priority, is_read, created_at, notify_to, created_by'
const DOCUMENT_SELECT = `
  document_id,
  title,
  file_name,
  file_type,
  file_size,
  file_path,
  created_at,
  uploaded_by,
  employee:uploaded_by (
    first_name,
    last_name,
    position
  )
`
const EMAIL_SELECT = `
  email_id,
  sender_id,
  recipient_email,
  subject,
  message_body,
  is_read,
  created_at,
  sender:sender_id (
    employee_id,
    first_name,
    last_name,
    position,
    department
  )
`
const BUSINESS_FORM_SELECT = `
  businessform_id,
  employee_id,
  start_date,
  end_date,
  location,
  company_car,
  driver_name,
  phone_num,
  project_name,
  status,
  created_at,
  employee:employee_id (
    employee_id,
    first_name,
    last_name,
    position,
    department
  )
`

const hasDateOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) <= new Date(end2) && new Date(end1) >= new Date(start2)
}

const orderByCreatedAtDesc = { ascending: false }

const getClient = () => getSupabaseServerClient()

const isAdmin = (viewer) => Boolean(viewer?.isAdmin) || Number(viewer?.employee?.hierarchy_level || 0) <= 4
const viewerEmployeeId = (viewer) => viewer?.employee?.employee_id ?? null
const viewerUserId = (viewer) => viewer?.employee?.user_id || viewer?.user?.id || null
const viewerEmail = (viewer) => viewer?.user?.email || viewer?.employee?.email || null

const queryOrThrow = async (query) => {
  const { data, error } = await query
  if (error) throw error
  return data || []
}

const scopeEmployeeQuery = (query, viewer, adminMode = false) => {
  if (isAdmin(viewer) || adminMode) return query
  const employeeId = viewerEmployeeId(viewer)
  return employeeId ? query.eq('employee_id', employeeId) : query.limit(0)
}

const scopeUserQuery = (query, viewer, column, adminMode = false) => {
  if (isAdmin(viewer) || adminMode) return query
  const userId = viewerUserId(viewer)
  return userId ? query.eq(column, userId) : query.limit(0)
}

const applyAdminMode = (query, adminMode) => adminMode ? query : query

const resolveEmployeeByName = async (name, viewer) => {
  if (!isAdmin(viewer)) return null
  const { data, error } = await getClient()
    .from('employee')
    .select('employee_id, email, first_name, last_name')
    .ilike('first_name', `%${name}%`)
    .limit(5)

  if (error || !data?.length) return null
  const exact = data.find(e => `${e.first_name} ${e.last_name}`.toLowerCase() === name.toLowerCase())
  return exact || data[0]
}

const loadInboxMessages = async (options = {}) => {
  const { viewer, scope = 'mine', targetEmployee = null, limit = 25 } = options
  const query = getClient().from('email').select(EMAIL_SELECT).order('created_at', { ascending: false }).limit(limit)

  if (scope === 'mine') {
    const myEmail = viewerEmail(viewer)
    const employeeId = viewerEmployeeId(viewer)
    if (myEmail) {
      query.or(`recipient_email.eq.${myEmail},recipient_email.eq.all`)
    }
    if (employeeId) {
      query.neq('sender_id', employeeId)
    }
  } else if (scope === 'employee') {
    if (!isAdmin(viewer)) return []
    const targetEmail = targetEmployee?.email
    const targetId = targetEmployee?.employee_id
    if (targetEmail) {
      query.or(`recipient_email.eq.${targetEmail},recipient_email.eq.all`)
    } else {
      return []
    }
    if (targetId) {
      query.neq('sender_id', targetId)
    }
  } else if (scope === 'all') {
    if (!isAdmin(viewer)) {
      const myEmail = viewerEmail(viewer)
      const employeeId = viewerEmployeeId(viewer)
      if (myEmail) {
        query.or(`recipient_email.eq.${myEmail},recipient_email.eq.all`)
      }
      if (employeeId) {
        query.neq('sender_id', employeeId)
      }
    }
  }

  const messages = await queryOrThrow(query)

  const recipientEmails = [...new Set(messages.map((m) => m.recipient_email).filter(Boolean))]
  if (recipientEmails.length > 0) {
    const { data: recipients } = await getClient()
      .from('employee')
      .select('email, first_name, last_name')
      .in('email', recipientEmails)

    const recipientMap = new Map((recipients || []).map((r) => [String(r.email || '').toLowerCase(), r]))

    return messages.map((msg) => ({
      ...msg,
      recipient: recipientMap.get(String(msg.recipient_email || '').toLowerCase()) || null,
    }))
  }

  return messages
}

const loadEmployees = async (options = {}) => {
  const { viewer, adminMode } = options
  const { activeOnly = true, fieldWorkersOnly = false, limit = 25 } = options
  let query = getClient().from('employee').select(EMPLOYEE_SELECT).order('first_name').limit(limit)

  if (activeOnly) {
    query = query.eq('employment_status', 'active').eq('is_archived', false)
  }

  if (fieldWorkersOnly) {
    query = query.eq('employee_type', 'field_worker')
  }

  query = scopeEmployeeQuery(query, viewer, adminMode)

  return await queryOrThrow(query)
}

const loadJobs = async (limit = 25, viewer = null, adminMode = false) => {
  const query = getClient().from('job').select(JOB_SELECT).order('created_at', orderByCreatedAtDesc).limit(limit)
  return await queryOrThrow(scopeEmployeeQuery(query, viewer, adminMode))
}

const loadApprovedLeaves = async (limit = 25, viewer = null, adminMode = false) => {
  const query = getClient()
    .from('leaveform')
    .select(LEAVE_SELECT)
    .eq('status', 'approved')
    .order('start_date', orderByCreatedAtDesc)
    .limit(limit)

  return await queryOrThrow(scopeEmployeeQuery(query, viewer, adminMode))
}

const loadApprovedOfficialBusiness = async (limit = 25, viewer = null, adminMode = false) => {
  const query = getClient()
    .from('businessform')
    .select(BUSINESS_FORM_SELECT)
    .eq('status', 'approved')
    .order('start_date', orderByCreatedAtDesc)
    .limit(limit)

  return await queryOrThrow(scopeEmployeeQuery(query, viewer, adminMode))
}

const loadContracts = async (limit = 25, viewer = null, adminMode = false) => {
  const query = getClient().from('contracts').select(CONTRACT_SELECT).order('created_at', orderByCreatedAtDesc).limit(limit)
  if (isAdmin(viewer) || adminMode) return await queryOrThrow(query)
  const employeeId = viewerEmployeeId(viewer)
  return await queryOrThrow(employeeId ? query.eq('contractor', employeeId) : query.limit(0))
}

const loadNotifications = async (limit = 25, unreadOnly = false, viewer = null, adminMode = false) => {
  let query = getClient().from('notification').select(NOTIFICATION_SELECT).order('created_at', orderByCreatedAtDesc).limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (!isAdmin(viewer) && !adminMode) {
    const employeeId = viewerEmployeeId(viewer)
    query = employeeId ? query.eq('notify_to', employeeId) : query.limit(0)
  }

  return await queryOrThrow(query)
}

const loadDocuments = async (limit = 25, viewer = null, adminMode = false) => {
  const query = getClient().from('document').select(DOCUMENT_SELECT).order('created_at', { ascending: false }).limit(limit)
  return await queryOrThrow(scopeUserQuery(query, viewer, 'uploaded_by', adminMode))
}

const loadRecommendations = async (viewer = null, adminMode = false) => {
  const [employees, leaves, jobs, officialBusiness] = await Promise.all([
    loadEmployees({ activeOnly: true, fieldWorkersOnly: true, limit: 50, viewer, adminMode }),
    loadApprovedLeaves(100, viewer, adminMode),
    loadJobs(100, viewer, adminMode),
    loadApprovedOfficialBusiness(100, viewer, adminMode),
  ])

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)

  const leaveByEmployee = new Map()
  leaves.forEach((leave) => {
    const key = leave.employee_id
    if (!leaveByEmployee.has(key)) leaveByEmployee.set(key, [])
    leaveByEmployee.get(key).push(leave)
  })

  const jobsByEmployee = new Map()
  jobs.forEach((job) => {
    if (!jobsByEmployee.has(job.employee_id)) jobsByEmployee.set(job.employee_id, [])
    jobsByEmployee.get(job.employee_id).push(job)
  })

  const officialBusinessByEmployee = new Map()
  officialBusiness.forEach((ob) => {
    const key = ob.employee_id
    if (!officialBusinessByEmployee.has(key)) officialBusinessByEmployee.set(key, [])
    officialBusinessByEmployee.get(key).push(ob)
  })

  const recommendations = employees
    .map((employee) => {
      let score = 0
      const reasons = []
      const employeeLeaves = leaveByEmployee.get(employee.employee_id) || []
      const employeeJobs = jobsByEmployee.get(employee.employee_id) || []
      const employeeOfficialBusiness = officialBusinessByEmployee.get(employee.employee_id) || []

      const onLeave = employeeLeaves.some((leave) =>
        hasDateOverlap(startDate, endDate, leave.start_date, leave.end_date)
      )

      const onOfficialBusiness = employeeOfficialBusiness.some((ob) =>
        hasDateOverlap(startDate, endDate, ob.start_date, ob.end_date)
      )

      if (!onLeave && !onOfficialBusiness) {
        score += 50
        reasons.push('Available')
      } else if (onLeave) {
        reasons.push('On Leave')
      } else if (onOfficialBusiness) {
        reasons.push('On Official Business')
      }

      const overlappingJobs = employeeJobs.filter((job) =>
        hasDateOverlap(startDate, endDate, job.start_date, job.end_date)
      )

      if (overlappingJobs.length === 0) {
        score += 30
        reasons.push('Low Workload')
      } else if (overlappingJobs.length <= 2) {
        score += 15
        reasons.push('Light Workload')
      }

      const completedJobs = employeeJobs.filter((job) => String(job.status || '').toLowerCase() === 'closed').length
      if (completedJobs >= 5) {
        score += 20
        reasons.push('Excellent Service History')
      } else if (completedJobs > 0) {
        score += 10
        reasons.push('Good Service History')
      }

      return {
        employee_id: employee.employee_id,
        full_name: `${employee.first_name} ${employee.last_name}`.trim(),
        position: employee.position,
        department: employee.department,
        score,
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return recommendations
}

const loadOperations = async (viewer = null, adminMode = false) => {
  const [employees, jobs, leaves, contracts, notifications] = await Promise.all([
    loadEmployees({ activeOnly: true, fieldWorkersOnly: false, limit: 100, viewer, adminMode }),
    loadJobs(100, viewer, adminMode),
    loadApprovedLeaves(100, viewer, adminMode),
    loadContracts(100, viewer, adminMode),
    loadNotifications(50, false, viewer, adminMode),
  ])

  const activeJobs = (jobs || []).filter((j) => String(j.status || '').toLowerCase() === 'open' || String(j.status || '').toLowerCase() === 'ongoing')
  const onLeave = leaves || []
  const expiringContracts = (contracts || []).filter((c) => {
    const end = c.end_date ? new Date(c.end_date) : null
    if (!end) return false
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    return end <= thirtyDays
  })
  const unreadNotifications = (notifications || []).filter((n) => !n.is_read)

  const conflictChecks = employees.map((emp) => {
    const empJobs = jobs.filter((j) => j.employee_id === emp.employee_id)
    const empLeaves = leaves.filter((l) => l.employee_id === emp.employee_id)
    let conflicts = 0
    empJobs.forEach((j) => {
      empLeaves.forEach((l) => {
        if (hasDateOverlap(j.start_date, j.end_date, l.start_date, l.end_date)) {
          conflicts++
        }
      })
    })
    return { employee_id: emp.employee_id, conflicts }
  }).filter((c) => c.conflicts > 0)

  return {
    employees: employees.length,
    active_jobs: activeJobs.length,
    employees_on_leave: onLeave.length,
    expiring_contracts: expiringContracts.length,
    unread_notifications: unreadNotifications.length,
    scheduling_conflicts: conflictChecks.length
  }
}

export const loadDataForIntent = async (intent, message, viewer = null, adminMode = false) => {
  try {
    const text = String(message || '').toLowerCase()

    if (intent === 'operations') {
      const operations = await loadOperations(viewer, adminMode)
      return { operations }
    }

    if (intent === 'chat_logs') {
      if (!isAdmin(viewer) && !adminMode) {
        const userId = viewerUserId(viewer)
        if (!userId) return { logs: [] }

        const { data: logs, error } = await getClient()
          .from('ai_chat_logs')
          .select('prompt, response, intent, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) return { logs: [] }
        return { logs: logs || [] }
      }

      const { data: logs, error } = await getClient()
        .from('ai_summarization')
        .select('content_summary, created_at, reference_type')
        .in('reference_type', ['weekly_leave_summary', 'contract_summary', 'notification_summary', 'job_daily_summary', 'employee_activity_summary'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) return { logs: [] }
      return { logs: logs || [] }
    }

    if (intent === 'employee') {
      const availabilityOnly = text.includes('available') || text.includes('who can') || text.includes('who is available')
      const employees = await loadEmployees({ activeOnly: true, fieldWorkersOnly: availabilityOnly, limit: availabilityOnly ? 50 : 25, viewer, adminMode })
      if (availabilityOnly) {
        const [jobs, leaves, officialBusiness] = await Promise.all([
          loadJobs(100, viewer, adminMode),
          loadApprovedLeaves(100, viewer, adminMode),
          loadApprovedOfficialBusiness(100, viewer, adminMode),
        ])
        return { employees, jobs, leaves, officialBusiness }
      }
      return { employees }
    }

    if (intent === 'job') {
      const jobs = await loadJobs(25, viewer, adminMode)
      return { jobs }
    }

    if (intent === 'leave') {
      const leaves = await loadApprovedLeaves(25, viewer, adminMode)
      return { leaves }
    }

    if (intent === 'contract') {
      const contracts = await loadContracts(25, viewer, adminMode)
      return { contracts }
    }

    if (intent === 'recommendation') {
      const recommendations = await loadRecommendations(viewer, adminMode)
      return { recommendations }
    }

    if (intent === 'notification') {
      const unreadOnly = text.includes('unread')
      const notifications = await loadNotifications(25, unreadOnly, viewer, adminMode)
      return { notifications }
    }

    if (intent === 'document') {
      const documents = await loadDocuments(25, viewer, adminMode)
      const documentsWithSummaries = await Promise.all(
        (documents || []).map(async (doc) => {
          const summary = await loadDocumentSummary(doc.document_id)
          return { ...doc, ai_summary: summary }
        })
      )
      return { documents: documentsWithSummaries }
    }

    if (intent === 'inbox') {
      const inboxScope = detectInboxScope(message, viewer)
      let targetEmployeeObj = null

      if (inboxScope.scope === 'employee' && inboxScope.targetName) {
        targetEmployeeObj = await resolveEmployeeByName(inboxScope.targetName, viewer)
      }

      const messages = await loadInboxMessages({
        viewer,
        scope: inboxScope.scope,
        targetEmployee: targetEmployeeObj,
        limit: 25,
      })

      return {
        messages,
        inboxScope: inboxScope.scope,
        targetEmployee: targetEmployeeObj,
        viewerEmail: viewerEmail(viewer),
      }
    }

    const [employees, jobs, leaves, contracts, notifications, documents] = await Promise.all([
      loadEmployees({ activeOnly: true, fieldWorkersOnly: false, limit: 10, viewer, adminMode }).catch((error) => {
        console.error('[DataLoader] employees failed', error)
        return []
      }),
      loadJobs(10, viewer, adminMode).catch((error) => {
        console.error('[DataLoader] jobs failed', error)
        return []
      }),
      loadApprovedLeaves(10, viewer, adminMode).catch((error) => {
        console.error('[DataLoader] leaves failed', error)
        return []
      }),
      loadContracts(10, viewer, adminMode).catch((error) => {
        console.error('[DataLoader] contracts failed', error)
        return []
      }),
      loadNotifications(10, false, viewer, adminMode).catch((error) => {
        console.error('[DataLoader] notifications failed', error)
        return []
      }),
      loadDocuments(10, viewer, adminMode).catch((error) => {
        console.error('[DataLoader] documents failed', error)
        return []
      }),
    ])

    return {
      employees,
      jobs,
      leaves,
      contracts,
      notifications,
      documents,
    }
  } catch (error) {
    console.error('[DataLoader] loadDataForIntent failed', {
      intent,
      message,
      viewer: viewer ? { employee_id: viewer.employee?.employee_id, user_id: viewer.user?.id } : null,
      error: error?.message || String(error),
      stack: error?.stack,
    })
    return {}
  }
}
