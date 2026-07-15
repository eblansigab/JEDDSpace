import { authorize } from '../../server/middleware/authorize.js'
import { handleListRolePermissions, handleSaveRolePermissions } from '../../server/admin/rolePermissionsHandler.js'
import { fail, ok } from '../../server/_shared/response.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed')
  }

  try {
    const authResult = await authorize(req, 'EMP_ROLE')
    if (!authResult.authorized) {
      return authResult.error
    }
    const viewer = authResult.viewer

    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
      const targetRoleId = url.searchParams.get('roleId') ? Number(url.searchParams.get('roleId')) : null
      const result = await handleListRolePermissions({ viewer, targetRoleId })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || {})
    }

    if (req.method === 'POST') {
      const payload = (req.body && typeof req.body === 'object') ? req.body : {}
      const result = await handleSaveRolePermissions({ viewer, payload })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || {})
    }

    return fail(res, 405, 'Method not allowed')
  } catch (error) {
    console.error('[ROLE_PERMISSIONS] Request failed', { error: error?.message })
    return fail(res, 500, 'Role permission service is currently unavailable.')
  }
}
