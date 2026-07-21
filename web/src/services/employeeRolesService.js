import { supabaseClient } from '../supabase/supabaseClient'

const getAuthHeaders = async () => {
  const { data: { session } } = await supabaseClient.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

export const employeeRolesService = {
  async getEmployeeRoles(employeeId) {
    const headers = await getAuthHeaders()
    const response = await fetch(
      `/api/admin/employee-roles?employeeId=${encodeURIComponent(employeeId)}`,
      { method: 'GET', headers }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || 'Failed to load employee roles.')
    }
    return result?.data?.roleIds || []
  },

  async saveEmployeeRoles(employeeId, roleIds) {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/admin/employee-roles', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetEmployeeId: employeeId, roleIds }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || 'Failed to save employee roles.')
    }
    return result?.data || {}
  },
}
