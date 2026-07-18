import { supabaseClient } from "../supabase/supabaseClient"

export const POSITION_OPTIONS = await getPositions()

export const DEPARTMENT_OPTIONS = ['engineering', 'admin']

export const NCR_DESTINATION_OPTIONS = [
  'Manila',
  'Quezon City',
  'Makati',
  'Taguig',
  'Pasig',
  'Mandaluyong',
  'San Juan',
  'Pasay',
  'Paranaque',
  'Las Pinas',
  'Muntinlupa',
  'Marikina',
  'Caloocan',
  'Malabon',
  'Navotas',
  'Valenzuela',
  'Pateros'
]

export const JOB_STATUS_OPTIONS = ['open', 'closed', 'pending', 'in progress', 'cancelled', 'problem']

export async function getPositions(){
  const { data: { session } } = await supabaseClient.auth.getSession()
  if (session?.access_token) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'manageable-roles' }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || 'Failed to load roles.')
    }

    return result?.roles || result?.data?.roles || []
  }

  const {data,error} = await supabaseClient.from("roles").select("role_id,role_name,hierarchy_level")
  if (error) throw error
  return data || []
}

