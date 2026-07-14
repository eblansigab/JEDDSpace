import { describe, test, expect, vi, beforeEach } from 'vitest'
import { permissionService, VALID_SCOPES } from './permissionService.js'

const mockSupabaseData = {
  roles: {
    admin: { role_id: 1, role_name: 'admin', hierarchy_level: 1 },
    employee: { role_id: 2, role_name: 'employee', hierarchy_level: 2 },
  },
  permissions: [
    { permission_id: 1, module: 'Employee Management', action: 'Add Employee' },
    { permission_id: 2, module: 'Announcements', action: 'Manage Announcements' },
    { permission_id: 3, module: 'AI Chat Logs', action: 'View Conversation History' },
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
                  data: { role_id: 1, roles: mockSupabaseData.roles.admin },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'role_permissions') {
          return {
            select: () => Promise.resolve({
              data: rolePermissions,
              error: null,
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

  test('hasAdminAccess returns true when user has any permission', async () => {
    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { employee_id: 1, role_id: 1 },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'role_permissions') {
          return {
            select: () => Promise.resolve({
              data: [{ permission_id: 1, scope: 'ALL' }],
              error: null,
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

  test('hasAdminAccess returns true for role with role_permissions even without loaded permission details', async () => {
    const mockClient = {
      from: (table) => {
        if (table === 'employee') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { employee_id: 2, role_id: 5 },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'role_permissions') {
          return {
            select: () => Promise.resolve({
              data: [{ permission_id: 1, scope: 'ALL' }],
              error: null,
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
    expect(result).toBe(true)
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
            select: () => Promise.resolve({
              data: [],
              error: null,
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

describe('VALID_SCOPES', () => {
  test('contains expected scopes', () => {
    expect(VALID_SCOPES).toEqual(['SELF', 'DEPARTMENT', 'SUBORDINATE', 'ALL'])
  })
})
