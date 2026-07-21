import { authorize } from '../../server/middleware/authorize.js'
import { handleGetEmployeeRoles, handleSaveEmployeeRoles } from '../../server/admin/employeeRolesHandler.js'
import { fail, ok } from '../../server/_shared/response.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const authResult = await authorize(req, 'EMP_ROLE')
    if (!authResult.authorized) {
      return authResult.error
    }
    const viewer = authResult.viewer

    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
      const employeeId = url.searchParams.get('employeeId')
      const result = await handleGetEmployeeRoles({ viewer, employeeId })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || {})
    }

    if (req.method === 'POST') {
      const result = await handleSaveEmployeeRoles({ viewer, payload: req.body || {} })
      if (result?.error) {
        return fail(res, result.status || 500, result.error)
      }
      return ok(res, result?.data || {})
    }

    return fail(res, 405, 'Method not allowed')
  } catch (error) {
    console.error('[EMPLOYEE_ROLES] Request failed', { error: error?.message })
    return fail(res, 500, 'Employee roles service is currently unavailable.')
  }
}
