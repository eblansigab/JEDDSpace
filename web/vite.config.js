/* global Buffer, process */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import Busboy from '@fastify/busboy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

const DEV_PERMISSION_CODES = new Set([
  'EMP_ADD',
  'EMP_PROFILE',
  'EMP_ROLE',
  'PROJ_MANAGE',
  'PROJ_ASSIGN',
  'PROJ_ARCHIVE',
  'LEAVE_VIEW',
  'LEAVE_MANAGE',
  'BLOCKCHAIN_AUDIT',
  'BLOCKCHAIN_VERIFY',
  'ANN_CREATE',
  'ANN_MANAGE',
  'AI_ANALYTICS',
  'AI_HISTORY',
  'AI_USERS',
  'AI_INTENTS',
  'DOCUMENTS_ACCESS',
  'PROJECTS_ACCESS',
  'AI_ACCESS',
  'ANNOUNCEMENTS_ACCESS',
  'CONTRACTS_ACCESS',
  'NOTIFICATIONS_ACCESS',
  'REPORTS_ACCESS',
  'ACCESS_ADMIN_DASHBOARD',
])

const DEV_DB_KEY_TO_CODE = {
  'Employee Management.Add Employee': 'EMP_ADD',
  'Employee Management.Manage Employee Profile': 'EMP_PROFILE',
  'Employee Management.Change Employee Role': 'EMP_ROLE',
  'Projects.Manage Projects': 'PROJ_MANAGE',
  'Projects.Assign Employees': 'PROJ_ASSIGN',
  'Projects.View Project Archives': 'PROJ_ARCHIVE',
  'Leave & Official Business.View Requests': 'LEAVE_VIEW',
  'Leave & Official Business.Manage Requests': 'LEAVE_MANAGE',
  'Blockchain Integrity.Audit Blockchain Records': 'BLOCKCHAIN_AUDIT',
  'Blockchain Integrity.Verify Integrity': 'BLOCKCHAIN_VERIFY',
  'Announcements.Create Announcements': 'ANN_CREATE',
  'Announcements.Manage Announcements': 'ANN_MANAGE',
  'AI Analytics.View AI Analytics': 'AI_ANALYTICS',
  'AI Chat Logs.View Conversation History': 'AI_HISTORY',
  'AI Chat Logs.View User Activity': 'AI_USERS',
  'AI Chat Logs.View Intent Classification': 'AI_INTENTS',
  'Application Access.Documents': 'DOCUMENTS_ACCESS',
  'Application Access.Projects': 'PROJECTS_ACCESS',
  'Application Access.AI Assistant': 'AI_ACCESS',
  'Application Access.Announcements': 'ANNOUNCEMENTS_ACCESS',
  'Application Access.Contracts': 'CONTRACTS_ACCESS',
  'Application Access.Notifications': 'NOTIFICATIONS_ACCESS',
  'Application Access.Reports': 'REPORTS_ACCESS',
  'Application Access.Admin Dashboard': 'ACCESS_ADMIN_DASHBOARD',
}

const normalizePermissionKey = (rawKey) => {
  const trimmed = String(rawKey || '').trim()
  if (!trimmed) return ''
  if (DEV_PERMISSION_CODES.has(trimmed)) return trimmed
  return DEV_DB_KEY_TO_CODE[trimmed] || trimmed.toLowerCase()
}

const buildPermission = (perm, scope = 'ALL') => {
  const module = String(perm.module || '').trim()
  const action = String(perm.action || '').trim()
  const rawKey = module && action ? `${module}.${action}` : ''

  return {
    permission_id: perm.permission_id,
    key: normalizePermissionKey(rawKey),
    rawKey,
    module,
    action,
    scope,
  }
}

const hasPermission = (permissions, permissionKey) => {
  const normalized = normalizePermissionKey(permissionKey)
  return (permissions || []).some((permission) =>
    permission.key === normalized || permission.rawKey === permissionKey
  )
}

const readJsonBody = async (req) => {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    return {}
  }
}

const sendJson = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const getBearerToken = (req) => {
  const header = req?.headers?.authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

const loadCurrentPermissions = async (client, req) => {
  const accessToken = getBearerToken(req)
  if (!accessToken) {
    return { status: 401, body: { success: false, error: 'Authentication is required.' } }
  }

  const { data: authData, error: authError } = await client.auth.getUser(accessToken)
  const user = authData?.user
  if (authError || !user?.id) {
    return { status: 401, body: { success: false, error: 'Authentication is required.' } }
  }

  const { data: employee, error: employeeError } = await client
    .from('employee')
    .select('employee_id, role_id, role, roles:role_id (role_name, hierarchy_level, is_protected)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (employeeError) throw employeeError
  if (!employee?.employee_id) {
    return { status: 403, body: { success: false, error: 'Employee record not found.' } }
  }

  const { data: allPermissions, error: permissionsError } = await client
    .from('permissions')
    .select('permission_id, module, action')

  if (permissionsError) throw permissionsError

  let permissions = []
  if (employee.roles?.is_protected === true) {
    permissions = (allPermissions || []).map((perm) => buildPermission(perm, 'ALL'))
  } else if (employee.role_id) {
    const { data: rolePermissions, error: rolePermissionsError } = await client
      .from('role_permissions')
      .select('permission_id, scope')
      .eq('role_id', employee.role_id)

    if (rolePermissionsError) throw rolePermissionsError

    const permissionMap = new Map((allPermissions || []).map((perm) => [perm.permission_id, perm]))
    permissions = (rolePermissions || []).map((row) => {
      const perm = permissionMap.get(row.permission_id) || {}
      return buildPermission({ ...perm, permission_id: row.permission_id }, row.scope || 'ALL')
    })
  }

  return {
    status: 200,
    body: {
      success: true,
      employee: {
        employee_id: employee.employee_id,
        role_id: employee.role_id,
        role: employee.roles?.role_name || employee.role,
        hierarchy_level: employee.roles?.hierarchy_level || 0,
      },
      permissions,
      data: { permissions },
    },
  }
}

const loadManageableRoles = async (client, req) => {
  const permissionResult = await loadCurrentPermissions(client, req)
  if (permissionResult.status !== 200) {
    return permissionResult
  }

  const permissions = permissionResult.body?.permissions || []
  if (!hasPermission(permissions, 'EMP_ROLE')) {
    return { status: 403, body: { success: false, error: 'Role management access required.' } }
  }

  const currentHierarchyLevel = permissionResult.body?.employee?.hierarchy_level || 0
  const { data, error } = await client
    .from('roles')
    .select('role_id, role_name, hierarchy_level')
    .gt('hierarchy_level', currentHierarchyLevel)
    .order('hierarchy_level', { ascending: true })
    .order('role_name', { ascending: true })

  if (error) throw error

  return {
    status: 200,
    body: {
      success: true,
      roles: data || [],
      data: { roles: data || [] },
    },
  }
}

const createAuthDevMiddleware = (env) => {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://eoxjathcdzhvdnqifgny.supabase.co'
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const client = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null

  return async (req, res, next) => {
    if (req.url !== '/api/auth' || req.method !== 'POST') {
      next()
      return
    }

    if (!client) {
      sendJson(res, 500, {
        success: false,
        error: 'Authentication service is not configured. Set SUPABASE_SERVICE_ROLE_KEY in web/.env.local.',
      })
      return
    }

    try {
      const body = await readJsonBody(req)

      if (body?.action === 'current-permissions') {
        const result = await loadCurrentPermissions(client, req)
        sendJson(res, result.status, result.body)
        return
      }

      if (body?.action === 'manageable-roles') {
        const result = await loadManageableRoles(client, req)
        sendJson(res, result.status, result.body)
        return
      }

      const username = String(body?.username || '').trim().toLowerCase()
      if (body?.action !== 'resolve-username' || !USERNAME_PATTERN.test(username)) {
        sendJson(res, 400, { success: false, error: 'Invalid username or password.' })
        return
      }

      const { data: employee, error } = await client
        .from('employee')
        .select('email, user_id, auth_user_id')
        .eq('username', username)
        .maybeSingle()

      if (error) throw error

      let email = employee?.email || null
      const authUserId = employee?.user_id || employee?.auth_user_id

      if (!email && authUserId) {
        const { data: authData, error: authError } = await client.auth.admin.getUserById(authUserId)
        if (authError) throw authError
        email = authData?.user?.email || null
      }

      if (!email) {
        sendJson(res, 404, { success: false, error: 'Invalid username or password.' })
        return
      }

      sendJson(res, 200, { success: true, email, data: { email } })
    } catch (error) {
      console.error('[AUTH DEV] Username resolution failed', error)
      sendJson(res, 500, { success: false, error: 'Authentication service is currently unavailable.' })
    }
  }
}

const sprint2ApiPaths = {
  '/api/messageImages/': join(__dirname, 'api', 'messageImages.js'),
  '/api/announcementImages/': join(__dirname, 'api', 'announcementImages.js'),
  '/api/announcementComments/': join(__dirname, 'api', 'announcementComments.js'),
  '/api/admin/employee-roles': join(__dirname, 'api', 'admin', 'employee-roles.js'),
}

const wrapRes = (res) => {
  const json = (body) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  const wrapped = {
    status: (code) => {
      res.statusCode = code
      return wrapped
    },
    json,
    end: (body) => res.end(body),
  }

  return wrapped
}

const parseRequestBody = async (req) => {
  const contentType = String(req.headers['content-type'] || '')

  if (contentType.includes('multipart/form-data')) {
    const busboy = new Busboy({ headers: req.headers })
    const fields = {}
    const files = []

    await new Promise((resolve, reject) => {
      busboy.on('field', (name, value) => {
        fields[name] = value
      })
      busboy.on('file', (name, stream, filename, encoding, mimeType) => {
        const chunks = []
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks)
          const file = new File([buffer], filename, { type: mimeType })
          files.push(file)
        })
      })
      busboy.on('finish', resolve)
      busboy.on('error', reject)
      req.pipe(busboy)
    })

    return { ...fields, files, file: files[0] || null }
  }

  if (contentType.includes('application/json')) {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const raw = Buffer.concat(chunks).toString('utf8')
    try {
      return JSON.parse(raw || '{}')
    } catch {
      return {}
    }
  }

  return {}
}

const createSprint2ApiMiddleware = async () => {
  const modules = await Promise.all(
    Object.entries(sprint2ApiPaths).map(async ([prefix, absolutePath]) => {
      try {
        const mod = await import(pathToFileURL(absolutePath).href)
        return { prefix, handler: mod.default }
      } catch (error) {
        console.error(`[SPRINT2 API] Failed to load ${absolutePath}:`, error)
        return { prefix, handler: null }
      }
    })
  )

  const handlers = new Map(modules.filter((m) => m.handler).map((m) => [m.prefix, m.handler]))

  return async (req, res, next) => {
    if (!req.url) {
      next()
      return
    }

    for (const [prefix, handler] of handlers) {
      if (req.url.startsWith(prefix)) {
        try {
          if (req.method === 'POST') {
            req.body = await parseRequestBody(req)
          }

          const wrappedRes = wrapRes(res)
          await handler(req, wrappedRes)

          if (!res.writableEnded) {
            res.end()
          }
          return
        } catch (error) {
          console.error(`[SPRINT2 API] ${prefix} error:`, error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Sprint 2 API service is currently unavailable.' }))
          return
        }
      }
    }

    next()
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  }
  if (env.SUPABASE_URL) {
    process.env.SUPABASE_URL = env.SUPABASE_URL
  }

  return {
    plugins: [
      react(),
      {
        name: 'jeddspace-auth-dev-api',
        configureServer: async (server) => {
          const authMiddleware = createAuthDevMiddleware(env)
          server.middlewares.use(authMiddleware)

          const sprint2Middleware = await createSprint2ApiMiddleware()
          server.middlewares.use(sprint2Middleware)
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      open: true,
      hmr: true,
      cors: true,
    },
  }
})
