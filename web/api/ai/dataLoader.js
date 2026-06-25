import { getSupabaseServerClient } from './supabaseClient.js'

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

const hasDateOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) <= new Date(end2) && new Date(end1) >= new Date(start2)
}

const orderByCreatedAtDesc = { ascending: false }

const getClient = () => getSupabaseServerClient()

const queryOrThrow = async (query) => {
  const { data, error } = await query
  if (error) throw error
  return data || []
}

const loadEmployees = async (options = {}) => {
  const { activeOnly = true, fieldWorkersOnly = false, limit = 25 } = options
  let query = getClient().from('employee').select(EMPLOYEE_SELECT).order('first_name').limit(limit)

  if (activeOnly) {
    query = query.eq('employment_status', 'active').eq('is_archived', false)
  }

  if (fieldWorkersOnly) {
    query = query.eq('employee_type', 'field_worker')
  }

  return await queryOrThrow(query)
}

const loadJobs = async (limit = 25) => {
  const query = getClient().from('job').select(JOB_SELECT).order('created_at', orderByCreatedAtDesc).limit(limit)
  return await queryOrThrow(query)
}

const loadApprovedLeaves = async (limit = 25) => {
  const query = getClient()
    .from('leaveform')
    .select(LEAVE_SELECT)
    .eq('status', 'approved')
    .order('start_date', orderByCreatedAtDesc)
    .limit(limit)

  return await queryOrThrow(query)
}

const loadContracts = async (limit = 25) => {
  const query = getClient().from('contracts').select(CONTRACT_SELECT).order('created_at', orderByCreatedAtDesc).limit(limit)
  return await queryOrThrow(query)
}

const loadNotifications = async (limit = 25, unreadOnly = false) => {
  let query = getClient().from('notification').select(NOTIFICATION_SELECT).order('created_at', orderByCreatedAtDesc).limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  return await queryOrThrow(query)
}

const loadRecommendations = async () => {
  const [employees, leaves, jobs] = await Promise.all([
    loadEmployees({ activeOnly: true, fieldWorkersOnly: true, limit: 50 }),
    loadApprovedLeaves(100),
    loadJobs(100),
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

  const recommendations = employees
    .map((employee) => {
      let score = 0
      const reasons = []
      const employeeLeaves = leaveByEmployee.get(employee.employee_id) || []
      const employeeJobs = jobsByEmployee.get(employee.employee_id) || []

      const onLeave = employeeLeaves.some((leave) =>
        hasDateOverlap(startDate, endDate, leave.start_date, leave.end_date)
      )

      if (!onLeave) {
        score += 50
        reasons.push('Available')
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

export const loadDataForIntent = async (intent, message) => {
  const text = String(message || '').toLowerCase()

  if (intent === 'employee') {
    const availabilityOnly = text.includes('available') || text.includes('who can') || text.includes('who is available')
    const employees = await loadEmployees({ activeOnly: true, fieldWorkersOnly: availabilityOnly, limit: availabilityOnly ? 50 : 25 })
    return { employees }
  }

  if (intent === 'job') {
    return { jobs: await loadJobs() }
  }

  if (intent === 'leave') {
    return { leaves: await loadApprovedLeaves() }
  }

  if (intent === 'contract') {
    return { contracts: await loadContracts() }
  }

  if (intent === 'recommendation') {
    return { recommendations: await loadRecommendations() }
  }

  if (intent === 'notification') {
    const unreadOnly = text.includes('unread')
    return { notifications: await loadNotifications(25, unreadOnly) }
  }

  const [employees, jobs, leaves, contracts, notifications] = await Promise.all([
    loadEmployees({ activeOnly: true, fieldWorkersOnly: false, limit: 10 }),
    loadJobs(10),
    loadApprovedLeaves(10),
    loadContracts(10),
    loadNotifications(10, false),
  ])

  return {
    employees,
    jobs,
    leaves,
    contracts,
    notifications,
  }
}
