import { supabaseClient } from '../supabase/supabaseClient'

const hasDateOverlap = (
  start1,
  end1,
  start2,
  end2
) => {
  return (
    new Date(start1) <= new Date(end2) &&
    new Date(end1) >= new Date(start2)
  )
}

export const getRecommendations = async ({
  startDate,
  endDate
}) => {
  if (!startDate || !endDate) {
    return []
  }

  try {
    const [{ data: employees, error: employeeError }, { data: leaveRecords, error: leaveError }, { data: allJobs, error: jobsError }] = await Promise.all([
      supabaseClient
        .from('employee')
        .select('employee_id,first_name,last_name,position,department,employee_type,employment_status,is_archived')
        .eq('employee_type', 'field_worker')
        .eq('employment_status', 'active')
        .eq('is_archived', false),
      supabaseClient
        .from('leaveform')
        .select('employee_id,start_date,end_date')
        .eq('status', 'approved'),
      supabaseClient
        .from('job')
        .select('employee_id,start_date,end_date,status')
    ])

    if (employeeError) throw employeeError
    if (leaveError) throw leaveError
    if (jobsError) throw jobsError

    const leaveByEmployee = {}
    leaveRecords?.forEach((lr) => {
      if (!leaveByEmployee[lr.employee_id]) leaveByEmployee[lr.employee_id] = []
      leaveByEmployee[lr.employee_id].push(lr)
    })

    const jobsByEmployee = {}
    allJobs?.forEach((job) => {
      if (!jobsByEmployee[job.employee_id]) jobsByEmployee[job.employee_id] = []
      jobsByEmployee[job.employee_id].push(job)
    })

    const recommendations = employees.map((employee) => {
      let score = 0
      const reasons = []

      const empLeaves = leaveByEmployee[employee.employee_id] || []
      const onLeave = empLeaves.some((leave) =>
        hasDateOverlap(startDate, endDate, leave.start_date, leave.end_date)
      )

      if (!onLeave) {
        score += 50
        reasons.push('Available')
      }

      const empJobs = jobsByEmployee[employee.employee_id] || []
      const overlappingJobs = empJobs.filter(
        (job) => hasDateOverlap(startDate, endDate, job.start_date, job.end_date)
      )

      if (overlappingJobs.length === 0) {
        score += 30
        reasons.push('Low Workload')
      } else if (overlappingJobs.length <= 2) {
        score += 15
        reasons.push('Light Workload')
      }

      const completedJobs = empJobs.filter((job) => job.status === 'closed').length
      if (completedJobs >= 5) {
        score += 20
        reasons.push('Excellent Service History')
      } else if (completedJobs > 0) {
        score += 10
        reasons.push('Good Service History')
      }

      return {
        employee_id: employee.employee_id,
        full_name: `${employee.first_name} ${employee.last_name}`,
        position: employee.position,
        score,
        reasons
      }
    })

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5)
  } catch (err) {
    console.error('[recommendationService]', err)
    throw err
  }
}