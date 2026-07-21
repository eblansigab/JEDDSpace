import { describe, test, expect, vi, beforeEach } from 'vitest'
import { permissionService, VALID_SCOPES } from './permissionService.js'

const mockSupabaseData = {
  roles: {
    admin: { role_id: 1, role_name: 'admin', hierarchy_level: 1, is_protected: true },
    employee: { role_id: 2, role_name: 'employee', hierarchy_level: 2, is_protected: false },
  },
  permissions: [
    { permission_id: 1, module: 'Employee Management', action: 'Add Employee' },
    { permission_id: 2, module: 'Announcements', action: 'Manage Announcements' },
    { permission_id: 3, module: 'AI Chat Logs', action: 'View Conversation History' },
    { permission_id: 4, module: 'Application Access', action: 'Admin Dashboard' },
  ],
}

const buildRolePermissionRow = (permissionId, scope = 'ALL') => ({
  permission_id: permissionId,
  scope,
})

describe('PermissionService', () => {
  beforeEach(() => {
    permissionService.invalidateCache()
    vi.resetModules()
  })

  test('constructs permission key from module and action', async () => {
    const rolePermissions = [
      buildRolePermissionRow(1, 'ALL'),
      buildRolePermissionRow(2, 'SELF'),
    ]

    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { role_id: 2, roles: mockSupabaseData.roles.employee },
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
        if (table === 'permissions') {
          return {
            select: () => Promise.resolve({
              data: mockSupabaseData.permissions,
              error: null,
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
    expect(perms[0].key).toBe('EMP_ADD')
    expect(perms[0].module).toBe('Employee Management')
    expect(perms[0].action).toBe('Add Employee')
    expect(perms[1].key).toBe('ANN_MANAGE')
    expect(perms[1].scope).toBe('SELF')
  })

  test('returns every permission with ALL scope for protected roles without role_permissions rows', async () => {
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
                data: [],
                error: null,
              }),
            }),
          }
        }
        if (table === 'permissions') {
          return {
            select: () => Promise.resolve({
              data: mockSupabaseData.permissions,
              error: null,
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
    expect(perms).toHaveLength(mockSupabaseData.permissions.length)
    expect(perms.every((perm) => perm.scope === 'ALL')).toBe(true)
    expect(perms.some((perm) => perm.key === 'ACCESS_ADMIN_DASHBOARD')).toBe(true)
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
      { key: 'EMP_ADD', scope: 'ALL' },
      { key: 'ANN_MANAGE', scope: 'DEPARTMENT' },
    ]
    expect(permissionService.hasPermission(perms, 'EMP_ADD')).toBe(true)
    expect(permissionService.hasPermission(perms, 'ANN_MANAGE')).toBe(true)
    expect(permissionService.hasPermission(perms, 'AI_HISTORY')).toBe(false)
  })

  test('hasAnyPermission returns true when permissions exist', async () => {
    expect(permissionService.hasAnyPermission([{ key: 'EMP_ADD', scope: 'ALL' }])).toBe(true)
    expect(permissionService.hasAnyPermission([])).toBe(false)
  })

  test('hasAdminAccess returns true when user has Admin Dashboard access', async () => {
    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { employee_id: 1, role_id: 2, roles: mockSupabaseData.roles.employee },
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
                data: [{ permission_id: 4, scope: 'ALL' }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'permissions') {
          return {
            select: () => Promise.resolve({
              data: mockSupabaseData.permissions,
              error: null,
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
    const result = await freshService.hasAdminAccess(1)
    expect(result).toBe(true)
  })

  test('hasAdminAccess returns false for role_permissions without Admin Dashboard access', async () => {
    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { employee_id: 2, role_id: 2, roles: mockSupabaseData.roles.employee },
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
                data: [{ permission_id: 1, scope: 'ALL' }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'permissions') {
          return {
            select: () => Promise.resolve({
              data: mockSupabaseData.permissions,
              error: null,
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
    const result = await freshService.hasAdminAccess(2)
    expect(result).toBe(false)
  })

  test('hasAdminAccess returns false for role without role_permissions', async () => {
    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { employee_id: 3, role_id: 10 },
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
                data: [],
                error: null,
              }),
            }),
          }
        }
        if (table === 'permissions') {
          return {
            select: () => Promise.resolve({
              data: mockSupabaseData.permissions,
              error: null,
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
    const result = await freshService.hasAdminAccess(3)
    expect(result).toBe(false)
  })

  test('getScope returns correct scope', async () => {
    const perms = [
      { key: 'EMP_ADD', scope: 'ALL' },
      { key: 'ANN_MANAGE', scope: 'SELF' },
    ]
    expect(permissionService.getScope(perms, 'EMP_ADD')).toBe('ALL')
    expect(permissionService.getScope(perms, 'ANN_MANAGE')).toBe('SELF')
    expect(permissionService.getScope(perms, 'missing')).toBeNull()
  })

  test('invalidateCache clears caches', async () => {
    permissionService.invalidateCache()
    expect(permissionService.roleCache.size).toBe(0)
    expect(permissionService.permissionCache.size).toBe(0)
  })
})

describe('PermissionService multi-role union', () => {
  beforeEach(() => {
    permissionService.invalidateCache()
    vi.resetModules()
  })

  const buildMultiRoleClient = (employeeRoleIds, rolePermsMap) => ({
    from: (table) => {
      if (table === 'employee_roles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: employeeRoleIds.map((role_id) => ({ role_id })),
              error: null,
            }),
          }),
        }
      }
      if (table === 'role_permissions') {
        return {
          select: () => ({
            eq: (field, value) => Promise.resolve({
              data: rolePermsMap[value] || [],
              error: null,
            }),
          }),
        }
      }
      if (table === 'permissions') {
        return {
          select: () => Promise.resolve({
            data: mockSupabaseData.permissions,
            error: null,
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
  })

  test('merges permissions across two roles by permission_id', async () => {
    const rolePermsMap = {
      2: [buildRolePermissionRow(1, 'ALL'), buildRolePermissionRow(2, 'SELF')],
      3: [buildRolePermissionRow(3, 'ALL')],
    }
    vi.doMock('../ai/supabaseClient.js', () => ({
      getSupabaseServerClient: () => buildMultiRoleClient([2, 3], rolePermsMap),
    }))
    const { permissionService: freshService } = await import('./permissionService.js')
    const perms = await freshService.getUserPermissions(1)
    expect(perms).toHaveLength(3)
    expect(perms.map((p) => p.key).sort()).toEqual(['AI_HISTORY', 'ANN_MANAGE', 'EMP_ADD'])
  })

  test('resolves scope conflict to broadest (ALL wins over DEPARTMENT)', async () => {
    const rolePermsMap = {
      2: [buildRolePermissionRow(1, 'DEPARTMENT')],
      3: [buildRolePermissionRow(1, 'ALL')],
    }
    vi.doMock('../ai/supabaseClient.js', () => ({
      getSupabaseServerClient: () => buildMultiRoleClient([2, 3], rolePermsMap),
    }))
    const { permissionService: freshService } = await import('./permissionService.js')
    const perms = await freshService.getUserPermissions(1)
    expect(perms).toHaveLength(1)
    expect(perms[0].key).toBe('EMP_ADD')
    expect(perms[0].scope).toBe('ALL')
  })

  test('falls back to employee.role_id when employee_roles is empty', async () => {
    const fallbackClient = {
      from: (table) => {
        if (table === 'employee_roles') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }
        }
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { role_id: 2, roles: mockSupabaseData.roles.employee },
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
                data: [buildRolePermissionRow(1, 'ALL')],
                error: null,
              }),
            }),
          }
        }
        if (table === 'permissions') {
          return {
            select: () => Promise.resolve({
              data: mockSupabaseData.permissions,
              error: null,
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
      getSupabaseServerClient: () => fallbackClient,
    }))
    const { permissionService: freshService } = await import('./permissionService.js')
    const perms = await freshService.getUserPermissions(1)
    expect(perms).toHaveLength(1)
    expect(perms[0].key).toBe('EMP_ADD')
  })
})

describe('VALID_SCOPES', () => {
  test('contains expected scopes', () => {
    expect(VALID_SCOPES).toEqual(['SELF', 'DEPARTMENT', 'SUBORDINATE', 'ALL'])
  })
})
