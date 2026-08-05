import { setCorsHeaders, handlePreflight } from '../server/_shared/cors.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return handlePreflight(res)
  }

  setCorsHeaders(res)

  return fail(res, 404, 'Not found')
}
