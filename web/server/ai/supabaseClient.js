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
  try {
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
      .select('employee_id, user_id, first_name, last_name, position, department, employee_type, role, employment_status, is_archived, role_id, roles:role_id (role_name, parent_role_id, hierarchy_level, is_protected)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (employeeError) {
      console.error('[getRequestUserContext] employee query failed', employeeError)
      return null
    }

    const employeePermissions = await (async () => {
      if (!employee?.employee_id) return []
      const { permissionService } = await import('../services/permissionService.js')
      return permissionService.getUserPermissions(employee.employee_id)
    })()

    const isAdminByPermission = Boolean(
      employeePermissions.some((p) => p.key === 'ACCESS_ADMIN_DASHBOARD')
    )

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
            role: employee.roles?.role_name || employee.role,
            role_id: employee.role_id,
            employment_status: employee.employment_status,
            is_archived: employee.is_archived,
            parent_role_id: employee.roles?.parent_role_id || null,
            hierarchy_level: employee.roles?.hierarchy_level || 0,
            is_protected: employee.roles?.is_protected === true,
          }
        : null,
      role: String(employee?.roles?.role_name || employee?.role || 'employee').toLowerCase(),
      isAdmin: isAdminByPermission,
      permissions: employeePermissions,
      role_id: employee?.role_id || null,
    }

    return viewer
  } catch (error) {
    console.error('[getRequestUserContext] unexpected error', error)
    return null
  }
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
