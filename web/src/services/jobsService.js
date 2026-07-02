import { supabaseClient } from '../supabase/supabaseClient'

export const jobService = {
  async getAll() {
    const { data, error } = await supabaseClient
      .from('job')
      .select(`
        *,
        employee:employee_id (
          first_name,
          last_name
        )
      `)

    if (error) throw error

    return data
  },

  async create(jobData) {
    const { data, error } = await supabaseClient
      .from('job')
      .insert([jobData])
      .select()
      .single()

    if (error) throw error

    return data
  },

  async update(jobId, updates) {
    const { data, error } = await supabaseClient
      .from('job')
      .update(updates)
      .eq('job_id', jobId)

    if (error) throw error

    return data
  },

  async remove(jobId) {
    const { data, error } = await supabaseClient
      .from('job')
      .delete()
      .eq('job_id', jobId)

    if (error) throw error

    return data
  }
}
