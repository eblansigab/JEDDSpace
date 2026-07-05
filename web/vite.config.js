/* global Buffer, process */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@supabase/supabase-js'

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

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

    const body = await readJsonBody(req)
    const username = String(body?.username || '').trim().toLowerCase()

    if (body?.action !== 'resolve-username' || !USERNAME_PATTERN.test(username)) {
      sendJson(res, 400, { success: false, error: 'Invalid username or password.' })
      return
    }

    try {
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'jeddspace-auth-dev-api',
        configureServer(server) {
          server.middlewares.use(createAuthDevMiddleware(env))
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
