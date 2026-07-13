import { describe, test, expect, vi, beforeEach } from 'vitest'
import { permissionService, VALID_SCOPES } from './permissionService.js'

const mockSupabaseData = {
  roles: {
    admin: { role_id: 1, role_name: 'admin', hierarchy_level: 1 },
    employee: { role_id: 2, role_name: 'employee', hierarchy_level: 2 },
  },
  permissions: {
    'dashboard.view': { permission_id: 1, module: 'dashboard', action: 'view' },
    'document.upload': { permission_id: 3, module: 'document', action: 'upload' },
  },
}

const buildPermissionRow = (permissionKey, scope = 'ALL') => {
  const perm = mockSupabaseData.permissions[permissionKey]
  if (!perm) return null
  return {
    permission_id: perm.permission_id,
    scope,
    permission: {
      module: perm.module,
      action: perm.action,
    },
  }
}

describe('PermissionService', () => {
  beforeEach(() => {
    permissionService.invalidateCache()
    vi.resetModules()
  })

  test('constructs permission key from module and action', async () => {
    const rolePermissions = [
      buildPermissionRow('dashboard.view', 'ALL'),
      buildPermissionRow('document.upload', 'SELF'),
    ]

    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { role_id: 1, roles: mockSupabaseData.roles.admin },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'role_permissions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: rolePermissions,
                error: null,
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }
      },
    }

    vi.doMock('../ai/supabaseClient.js', () => ({
      getSupabaseServerClient: () => mockClient,
    }))

    const { permissionService: freshService } = await import('./permissionService.js')
    const perms = await freshService.getUserPermissions(1)
    expect(perms).toHaveLength(2)
    expect(perms[0].key).toBe('dashboard.view')
    expect(perms[0].module).toBe('dashboard')
    expect(perms[0].action).toBe('view')
    expect(perms[1].key).toBe('document.upload')
    expect(perms[1].scope).toBe('SELF')
  })

  test('returns empty array for missing role', async () => {
    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }
      },
    }

    vi.doMock('../ai/supabaseClient.js', () => ({
      getSupabaseServerClient: () => mockClient,
    }))

    const { permissionService: freshService } = await import('./permissionService.js')
    const perms = await freshService.getUserPermissions(999)
    expect(perms).toEqual([])
  })

  test('hasPermission returns true for matching permission', async () => {
    const perms = [
      { key: 'dashboard.view', scope: 'ALL' },
      { key: 'document.view', scope: 'DEPARTMENT' },
    ]
    expect(permissionService.hasPermission(perms, 'dashboard.view')).toBe(true)
    expect(permissionService.hasPermission(perms, 'document.view')).toBe(true)
    expect(permissionService.hasPermission(perms, 'ai.chat')).toBe(false)
  })

  test('getScope returns correct scope', async () => {
    const perms = [
      { key: 'dashboard.view', scope: 'ALL' },
      { key: 'document.view', scope: 'SELF' },
    ]
    expect(permissionService.getScope(perms, 'dashboard.view')).toBe('ALL')
    expect(permissionService.getScope(perms, 'document.view')).toBe('SELF')
    expect(permissionService.getScope(perms, 'missing')).toBeNull()
  })

  test('invalidateCache clears caches', async () => {
    permissionService.invalidateCache()
    expect(permissionService.roleCache.size).toBe(0)
    expect(permissionService.permissionCache.size).toBe(0)
  })
})

describe('VALID_SCOPES', () => {
  test('contains expected scopes', () => {
    expect(VALID_SCOPES).toEqual(['SELF', 'DEPARTMENT', 'SUBORDINATE', 'ALL'])
  })
})
