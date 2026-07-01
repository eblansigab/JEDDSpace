import { supabaseClient } from '../supabase/supabaseClient'

export const contractService = {
  async getAllContracts() {
    const { data, error } = await supabaseClient
      .from('contracts')
      .select(`
        contracts_id,
        contract_title,
        contract_url,
        contract_file_url,
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
        ),
        job:job_id (
          job_id,
          employee_id,
          department,
          destination,
          start_date,
          end_date,
          status,
          notes,
          employee:employee_id (
            employee_id,
            first_name,
            last_name,
            position,
            department
          )
        )
      `)

    if (error) throw error
    return data || []
  }
}