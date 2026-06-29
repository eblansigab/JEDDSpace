/* global process */

export const handleHealth = async ({ viewer }) => {
  if (!viewer?.isAdmin) {
    return { status: viewer?.user?.id ? 403 : 401, error: 'Admin access required' }
  }

  return {
    data: {
      hasGroq: Boolean(process.env.GROQ_API_KEY),
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  }
}
