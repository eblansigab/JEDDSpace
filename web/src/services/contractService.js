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
        job_id,
        contractor:contractor (
          employee_id,
          first_name,
          last_name,
          position,
          department
        )
      `)

    if (error) throw error
    return data || []
  },

  async createContract(contractData) {
    const { data, error } = await supabaseClient
      .from('contracts')
      .insert([contractData])
      .select()
      .single()

    if (error) throw error

    return data
  }
}