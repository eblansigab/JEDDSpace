import { supabaseClient } from '../supabase/supabaseClient'

export const ANNOUNCEMENT_STATUSES = ['Published', 'Draft', 'Archived']
export const ANNOUNCEMENT_VISIBILITY_SCOPES = ['ORGANIZATION', 'DEPARTMENT', 'ROLE']

export const announcementService = {
  async createAnnouncement(data) {
    const payload = {
      title: data.title?.trim(),
      body: data.body?.trim(),
      status: data.status || 'Draft',
      visibility_scope: data.visibilityScope || 'ORGANIZATION',
      visibility_target: data.visibilityTarget || null,
    }

    if (data.userId) {
      payload.user_id = data.userId
    }

    const { data: result, error } = await supabaseClient
      .from('announcement')
      .insert([payload])
      .select()
      .single()

    if (error) {
      throw error
    }

    return result
  },

  async updateAnnouncement(announcementId, updates) {
    const payload = {
      ...updates,
      title: updates.title?.trim(),
      body: updates.body?.trim(),
      ...(updates.visibilityScope ? { visibility_scope: updates.visibilityScope } : {}),
      ...(updates.visibilityTarget !== undefined ? { visibility_target: updates.visibilityTarget } : {}),
    }

    const { data, error } = await supabaseClient
      .from('announcement')
      .update(payload)
      .eq('announcement_id', announcementId)
      .select()
      .single()

    if (error) {
      const fallback = await supabaseClient
        .from('announcement')
        .update(payload)
        .eq('id', announcementId)
        .select()
        .single()

      if (fallback.error) {
        throw error
      }

      return fallback.data
    }

    return data
  },

  async getAnnouncements(viewer) {
    const { data, error } = await supabaseClient
      .from('announcement')
      .select('*')
      .order('created_at', {
        ascending: false
      })

    if (error) {
      throw error
    }

    const announcements = data || []
    if (!viewer) {
      return announcements
    }

    const isAdmin = Boolean(viewer.isAdmin)
    const userDepartment = String(viewer.employee?.department || '').trim().toLowerCase()
    const userRoleId = viewer.employee?.role_id ?? null
    const scope = String(viewer.scope || '').trim().toUpperCase()

    return announcements.filter((item) => {
      const visibilityScope = String(item.visibility_scope || 'ORGANIZATION').toUpperCase()
      const visibilityTarget = item.visibility_target ? String(item.visibility_target).trim() : null

      if (visibilityScope === 'ORGANIZATION') {
        return true
      }

      if (!isAdmin) {
        return false
      }

      if (visibilityScope === 'DEPARTMENT') {
        if (!userDepartment) return false
        if (!visibilityTarget) return true
        return visibilityTarget.toLowerCase() === userDepartment
      }

      if (visibilityScope === 'ROLE') {
        if (!userRoleId) return false
        if (!visibilityTarget) return true
        return String(visibilityTarget) === String(userRoleId)
      }

      return true
    })
  },

  async getAvailableAudiences(viewer) {
    const isAdmin = Boolean(viewer.isAdmin)
    const scope = String(viewer.scope || '').trim().toUpperCase()
    const userDepartment = String(viewer.employee?.department || '').trim()
    const userRoleId = viewer.employee?.role_id ?? null

    const canAccess = (allowed) => allowed.some((s) => s === scope || s === 'ALL')

    const audiences = [{ label: 'Entire Organization', value: 'ORGANIZATION', target: null }]

    if (canAccess(['ALL', 'DEPARTMENT', 'SUBORDINATE'])) {
      if (userDepartment) {
        audiences.push({ label: `Department: ${userDepartment}`, value: 'DEPARTMENT', target: userDepartment })
      }
    }

    if (canAccess(['ALL', 'SUBORDINATE']) && userRoleId) {
      audiences.push({ label: 'My Role', value: 'ROLE', target: String(userRoleId) })
    }

    return audiences
  },

  async markViewed(announcementId, employeeId) {
    const { error } = await supabaseClient
      .from('announcement_views')
      .upsert(
        { announcement_id: announcementId, employee_id: employeeId, viewed_at: new Date().toISOString() },
        { onConflict: ['announcement_id', 'employee_id'] }
      )

    if (error) {
      console.error('[announcementService] markViewed failed', error)
    }
  },

  async getViews(announcementId) {
    const { data, error } = await supabaseClient
      .from('announcement_views')
      .select('announcement_view_id, announcement_id, employee_id, viewed_at, employee:employee_id (first_name, last_name, department)')
      .eq('announcement_id', announcementId)
      .order('viewed_at', { ascending: false })

    if (error) {
      console.error('[announcementService] getViews failed', error)
      return []
    }

    return (data || []).map((view) => {
      const employee = view.employee || {}
      return {
        announcement_view_id: view.announcement_view_id,
        employee_id: view.employee_id,
        viewed_at: view.viewed_at,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
        department: employee.department || '',
      }
    })
  },

  async addReaction(announcementId, employeeId, reactionType) {
    const { error } = await supabaseClient
      .from('announcement_reactions')
      .upsert(
        { announcement_id: announcementId, employee_id: employeeId, reaction_type: reactionType, updated_at: new Date().toISOString() },
        { onConflict: ['announcement_id', 'employee_id'] }
      )

    if (error) {
      console.error('[announcementService] addReaction failed', error)
      throw error
    }
  },

  async getReactions(announcementId) {
    const { data, error } = await supabaseClient
      .from('announcement_reactions')
      .select('announcement_reaction_id, announcement_id, employee_id, reaction_type, created_at, updated_at, employee:employee_id (first_name, last_name, department)')
      .eq('announcement_id', announcementId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[announcementService] getReactions failed', error)
      return []
    }

    return (data || []).map((reaction) => {
      const employee = reaction.employee || {}
      return {
        announcement_reaction_id: reaction.announcement_reaction_id,
        employee_id: reaction.employee_id,
        reaction_type: reaction.reaction_type,
        created_at: reaction.created_at,
        updated_at: reaction.updated_at,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
        department: employee.department || '',
      }
    })
  },

  async getReactionSummary(announcementId) {
    const { data, error } = await supabaseClient
      .from('announcement_reactions')
      .select('reaction_type')
      .eq('announcement_id', announcementId)

    if (error) {
      console.error('[announcementService] getReactionSummary failed', error)
      return {}
    }

    return (data || []).reduce((summary, row) => {
      const type = row.reaction_type || 'unknown'
      summary[type] = (summary[type] || 0) + 1
      return summary
    }, {})
  },
}

