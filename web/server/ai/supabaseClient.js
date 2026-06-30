/* global process */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eoxjathcdzhvdnqifgny.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let cachedClient = null

export const getSupabaseServerClient = () => {
  if (cachedClient) return cachedClient

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase server credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return cachedClient
}

const getBearerToken = (req) => {
  const header = req?.headers?.authorization || req?.headers?.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

export const getRequestUserContext = async (req) => {
  const accessToken = getBearerToken(req)
  if (!accessToken) return null

  const client = getSupabaseServerClient()
  const { data: authData, error: authError } = await client.auth.getUser(accessToken)
  const user = authData?.user

  if (authError || !user?.id) {
    return null
  }

  const { data: employee, error: employeeError } = await client
    .from('employee')
    .select('employee_id, user_id, first_name, last_name, position, department, employee_type, role, employment_status, is_archived')
    .eq('user_id', user.id)
    .maybeSingle()

  if (employeeError) {
    throw employeeError
  }

  const viewer = {
    user: {
      id: user.id,
      email: user.email,
    },
    employee: employee
      ? {
          employee_id: employee.employee_id,
          user_id: employee.user_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          full_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || null,
          email: user.email || null,
          position: employee.position,
          department: employee.department,
          employee_type: employee.employee_type,
          role: employee.role,
          employment_status: employee.employment_status,
          is_archived: employee.is_archived,
        }
      : null,
    role: String(employee?.role || 'employee').toLowerCase(),
    isAdmin: String(employee?.role || '').toLowerCase() === 'admin',
  }

  return viewer
}

export const saveSummary = async ({ referenceType, contentSummary, rawDataSnapshot }) => {
  const client = getSupabaseServerClient()
  const { data, error } = await client
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

export const getSummaryByType = async (referenceType) => {
  const client = getSupabaseServerClient()
  const { data, error } = await client
    .from('ai_summarization')
    .select('content_summary, raw_data_snapshot')
    .eq('reference_type', referenceType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}
