import { getSupabaseServerClient } from '../server/ai/supabaseClient.js'
import { fail, ok } from '../server/_shared/response.js'

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

const normalizeUsername = (username) => {
  const trimmed = String(username || '').trim()

  if (!trimmed || !USERNAME_PATTERN.test(trimmed)) {
    return null
  }

  return trimmed.toLowerCase()
}

const resolveEmailByUsername = async (username) => {
  const client = getSupabaseServerClient()
  const { data: employee, error } = await client
    .from('employee')
    .select('email, user_id, auth_user_id')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  if (!employee) return null
  if (employee.email) return employee.email

  const authUserId = employee.user_id || employee.auth_user_id
  if (!authUserId) return null

  const { data: authData, error: authError } = await client.auth.admin.getUserById(authUserId)
  if (authError) throw authError

  return authData?.user?.email || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed')
  }

  const { action, username } = req.body || {}

  if (action !== 'resolve-username') {
    return fail(res, 400, 'Unsupported auth action.')
  }

  const normalizedUsername = normalizeUsername(username)
  if (!normalizedUsername) {
    return fail(res, 400, 'Invalid username or password.')
  }

  try {
    const email = await resolveEmailByUsername(normalizedUsername)
    if (!email) {
      return fail(res, 404, 'Invalid username or password.')
    }

    return ok(res, { email })
  } catch (error) {
    console.error('[AUTH] Username resolution failed', { error: error?.message })
    return fail(res, 500, 'Authentication service is currently unavailable.')
  }
}
