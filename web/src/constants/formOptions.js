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
  const {data,error} = await supabaseClient.from("roles").select("role_name,hierarchy_level")
  return data
}

