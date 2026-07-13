import { getRequestUserContext } from '../ai/supabaseClient.js'
import { permissionService, VALID_SCOPES } from '../services/permissionService.js'
import { fail } from '../_shared/response.js'

const authorize = async (req, requiredPermission, allowedScopes = null) => {
  const viewer = await getRequestUserContext(req)
  if (!viewer?.user?.id) {
    return { authorized: false, viewer: null, error: fail(req, 401, 'Authentication is required.') }
  }

  const employeeId = viewer.employee?.employee_id
  if (!employeeId) {
    return { authorized: false, viewer, error: fail(req, 403, 'Employee record not found.') }
  }

  const permissions = await permissionService.getUserPermissions(employeeId)
  const hasPerm = permissionService.hasPermission(permissions, requiredPermission)

  if (!hasPerm) {
    return { authorized: false, viewer, error: fail(req, 403, `Missing permission: ${requiredPermission}`) }
  }

  if (allowedScopes) {
    const scopeArray = Array.isArray(allowedScopes) ? allowedScopes : [allowedScopes]
    const grantedScope = permissionService.getScope(permissions, requiredPermission)
    const scopeOk = scopeArray.some(
      (s) => VALID_SCOPES.includes(s) && grantedScope === s
    )
    if (!scopeOk) {
      return { authorized: false, viewer, error: fail(req, 403, `Insufficient scope for ${requiredPermission}.`) }
    }
  }

  return { authorized: true, viewer: { ...viewer, permissions }, error: null }
}

export { authorize, VALID_SCOPES }
