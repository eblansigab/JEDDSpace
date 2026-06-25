import { supabaseClient } from '../supabase/supabaseClient'
import { aiService } from './aiService'
import { aiPromptBuilder } from './aiPromptBuilder'
import { employeeService } from './employeeService'
import { jobService } from './jobsService'
import { contractService } from './contractService'
import { notificationService } from './notificationService'

const saveSummary = async ({ referenceType, contentSummary, rawDataSnapshot }) => {
  const { data, error } = await supabaseClient
    .from('ai_summarization')
    .insert([
      {
        reference_type: referenceType,
        content_summary: contentSummary,
        raw_data_snapshot: rawDataSnapshot,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

const buildSnapshot = (label, items) => {
  const lines = [`${label}:`]

  ;(items || []).slice(0, 25).forEach((item) => {
    lines.push(`- ${item}`)
  })

  return lines.join('\n')
}

export const aiSummaryService = {
  async summarizeJobs() {
    const jobs = await jobService.getAll()
    const snapshot = buildSnapshot(
      'Jobs',
      (jobs || []).map((job) => `${job.destination || 'Unknown'} | ${job.status || 'Unknown'} | ${job.start_date || 'Unknown'} - ${job.end_date || 'Unknown'}`)
    )
    const prompt = await aiPromptBuilder.buildSummaryPrompt({
      referenceType: 'job_daily_summary',
      rawDataSnapshot: snapshot,
    })
    const contentSummary = await aiService.summarize(prompt)
    return await saveSummary({
      referenceType: 'job_daily_summary',
      contentSummary,
      rawDataSnapshot: snapshot,
    })
  },

  async summarizeLeaves() {
    const { data, error } = await supabaseClient
      .from('leaveform')
      .select('leaveform_id, employee_id, start_date, end_date, reason, status, employee:employee_id ( first_name, last_name )')
      .eq('status', 'approved')
      .order('start_date', { ascending: true })

    if (error) throw error

    const snapshot = buildSnapshot(
      'Approved leaves',
      (data || []).map((leave) => {
        const employeeName = leave.employee
          ? `${leave.employee.first_name || ''} ${leave.employee.last_name || ''}`.trim()
          : `Employee ${leave.employee_id || 'Unknown'}`
        return `${employeeName} | ${leave.start_date || 'Unknown'} - ${leave.end_date || 'Unknown'} | ${leave.reason || 'No reason'}`
      })
    )

    const prompt = await aiPromptBuilder.buildSummaryPrompt({
      referenceType: 'weekly_leave_summary',
      rawDataSnapshot: snapshot,
    })
    const contentSummary = await aiService.summarize(prompt)
    return await saveSummary({
      referenceType: 'weekly_leave_summary',
      contentSummary,
      rawDataSnapshot: snapshot,
    })
  },

  async summarizeContracts() {
    const contracts = await contractService.getAllContracts()
    const snapshot = buildSnapshot(
      'Contracts',
      (contracts || []).map((contract) => `${contract.contract_title || 'Untitled'} | ${contract.status || 'Unknown'} | ${contract.start_date || 'Unknown'} - ${contract.end_date || 'Unknown'}`)
    )
    const prompt = await aiPromptBuilder.buildSummaryPrompt({
      referenceType: 'contract_summary',
      rawDataSnapshot: snapshot,
    })
    const contentSummary = await aiService.summarize(prompt)
    return await saveSummary({
      referenceType: 'contract_summary',
      contentSummary,
      rawDataSnapshot: snapshot,
    })
  },

  async summarizeNotifications() {
    const notifications = await notificationService.getNotifications()
    const snapshot = buildSnapshot(
      'Notifications',
      (notifications || []).map((notification) => `${notification.title || 'Untitled'} | ${notification.type || 'Unknown'} | ${notification.priority || 'Normal'}`)
    )
    const prompt = await aiPromptBuilder.buildSummaryPrompt({
      referenceType: 'notification_summary',
      rawDataSnapshot: snapshot,
    })
    const contentSummary = await aiService.summarize(prompt)
    return await saveSummary({
      referenceType: 'notification_summary',
      contentSummary,
      rawDataSnapshot: snapshot,
    })
  },

  async summarizeEmployeeActivity() {
    const employees = await employeeService.getAll()
    const snapshot = buildSnapshot(
      'Employee activity',
      (employees || []).map((employee) => `${employee.first_name || ''} ${employee.last_name || ''}`.trim())
    )
    const prompt = await aiPromptBuilder.buildSummaryPrompt({
      referenceType: 'employee_activity_summary',
      rawDataSnapshot: snapshot,
    })
    const contentSummary = await aiService.summarize(prompt)
    return await saveSummary({
      referenceType: 'employee_activity_summary',
      contentSummary,
      rawDataSnapshot: snapshot,
    })
  },
}
