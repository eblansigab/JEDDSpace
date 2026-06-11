import { supabaseClient } from '../supabase/supabaseClient'
import { UAParser } from 'ua-parser-js'

/**
 * Detect the current device name (Browser on OS) using UAParser.
 * Falls back to a manual UA parse if UAParser is unavailable.
 */
export const getDeviceDetails = () => {
  try {
    const parser = new UAParser()
    const result = parser.getResult()
    const browserName = result.browser?.name || 'Unknown Browser'
    const osName = result.os?.name || 'Unknown OS'
    return `${browserName} on ${osName}`
  } catch (err) {
    // Fallback manual parsing
    const ua = navigator.userAgent
    let browser = 'Unknown Browser'
    let os = 'Unknown OS'

    if (ua.indexOf('Win') !== -1) os = 'Windows'
    else if (ua.indexOf('Mac') !== -1) os = 'macOS'
    else if (ua.indexOf('X11') !== -1) os = 'UNIX'
    else if (ua.indexOf('Linux') !== -1) os = 'Linux'
    else if (/Android/.test(ua)) os = 'Android'
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'

    if (ua.indexOf('Firefox') !== -1) browser = 'Firefox'
    else if (ua.indexOf('SamsungBrowser') !== -1) browser = 'Samsung Browser'
    else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) browser = 'Opera'
    else if (ua.indexOf('Trident') !== -1) browser = 'Internet Explorer'
    else if (ua.indexOf('Edge') !== -1 || ua.indexOf('Edg') !== -1) browser = 'Edge'
    else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome'
    else if (ua.indexOf('Safari') !== -1) browser = 'Safari'

    return `${browser} on ${os}`
  }
}

export const getIpAddress = async () => {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 2000) // 2s timeout

    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal })
    clearTimeout(id)
    const data = await res.json()
    return data.ip || '112.198.115.6'
  } catch (e) {
    console.warn('Failed to fetch public IP, using fallback:', e)
    return '112.198.115.6' // fallback IP
  }
}

const SESSION_STORAGE_KEY = 'jeddspace_current_session_id'

/**
 * Format a timestamp into a human-readable "last active" string
 * (e.g. "Just now", "5 minutes ago", "1 day ago").
 */
const formatRelativeTime = (isoTimestamp) => {
  if (!isoTimestamp) return 'Never'
  const then = new Date(isoTimestamp).getTime()
  const now = Date.now()
  const diffMs = now - then
  if (diffMs < 0) return 'Just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 30) return 'Just now'
  if (seconds < 60) return `${seconds} seconds ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export const sessionService = {
  /**
   * Step 2: Create a session record after a successful login.
   * Inserts a new row into user_sessions with device + IP info.
   */
  async createSession(userId) {
    try {
      const deviceName = getDeviceDetails()
const ipAddress = 'Unknown'
      // Mark all previous sessions for this user as no-longer-current,
      // so a single user can only have one "current" row.
      await supabaseClient
        .from('user_sessions')
        .update({ is_current: false })
        .eq('user_id', userId)

      const { data, error } = await supabaseClient
        .from('user_sessions')
        .insert({
          user_id: userId,
          device_name: deviceName,
          ip_address: ipAddress,
          is_current: true,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      if (data && data.session_id) {
        localStorage.setItem(SESSION_STORAGE_KEY, data.session_id)
        return data.session_id
      }
    } catch (err) {
      console.error('Error creating database session:', err)
    }
    return null
  },

  /**
   * Step 3: Update activity timestamp for the current session.
   * Call on page load or every few minutes to indicate liveness.
   */
  async updateSessionActivity() {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!sessionId) return

    try {
      await supabaseClient
        .from('user_sessions')
        .update({
          last_active: new Date().toISOString()
        })
        .eq('session_id', sessionId)
    } catch (err) {
      console.error('Error updating session activity:', err)
    }
  },

  /**
   * Step 4: Fetch all sessions for the user from the database.
   * Returns real data with "is_current" derived from local storage
   * AND the "last_active" formatted as a relative time string.
   */
  async getActiveSessions(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false })

      if (error) throw error

      const currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
      return (data || []).map(session => ({
        ...session,
        // Mark as current based on our local storage session ID
        is_current: session.session_id === currentSessionId,
        // Provide a friendly relative-time label
        last_active_display: formatRelativeTime(session.last_active)
      }))
    } catch (err) {
      console.error('Error fetching active sessions:', err)
      return []
    }
  },

  /**
   * Step 5: Revoke a session by deleting it from the database.
   */
  async revokeSession(sessionId) {
    try {
      const { error } = await supabaseClient
        .from('user_sessions')
        .delete()
        .eq('session_id', sessionId)

      if (error) throw error

      // If we revoked the current session, clear local storage
      const currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
      if (sessionId === currentSessionId) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
      return true
    } catch (err) {
      console.error('Error revoking session:', err)
      throw err
    }
  },

  /**
   * Revoke ALL sessions for a user (e.g. "Log out all devices").
   */
  async revokeAllSessions(userId) {
    try {
      const { error } = await supabaseClient
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      localStorage.removeItem(SESSION_STORAGE_KEY)
      return true
    } catch (err) {
      console.error('Error revoking all sessions:', err)
      throw err
    }
  },

  clearCurrentSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  },

  getCurrentSessionId() {
    return localStorage.getItem(SESSION_STORAGE_KEY)
  }
}
