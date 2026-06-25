export default function handler(req, res) {
  return res.status(200).json({
    hasGroq: !!process.env.GROQ_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    envKeys: Object.keys(process.env).filter(k =>
      ["GROQ", "SUPABASE", "VERCEL"].some(prefix => k.includes(prefix))
    ),
  });
}