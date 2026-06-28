import { getRequestUserContext, getSupabaseServerClient } from './ai/supabaseClient.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const viewer = await getRequestUserContext(req)
    if (!viewer?.isAdmin) {
      return res.status(viewer?.user?.id ? 403 : 401).json({ error: 'Admin access required' })
    }

    const client = getSupabaseServerClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - 7)
    const monthStart = new Date(todayStart)
    monthStart.setMonth(todayStart.getMonth() - 1)

    const [intentCounts, todayCount, weekCount, monthCount] = await Promise.all([
      client
        .from('ai_chat_logs')
        .select('intent')
        .not('intent', 'is', null),

      client
        .from('ai_chat_logs')
        .select('chat_id', { count: 'exact' })
        .gte('created_at', todayStart.toISOString()),

      client
        .from('ai_chat_logs')
        .select('chat_id', { count: 'exact' })
        .gte('created_at', weekStart.toISOString()),

      client
        .from('ai_chat_logs')
        .select('chat_id', { count: 'exact' })
        .gte('created_at', monthStart.toISOString())
    ])

    const topicStats = {}
    intentCounts.data?.forEach(row => {
      const intent = row.intent || 'other'
      topicStats[intent] = (topicStats[intent] || 0) + 1
    })

    const totalTopics = Object.values(topicStats).reduce((a, b) => a + b, 0)
    const topics = Object.entries(topicStats)
      .map(([name, count]) => ({
        name,
        percentage: totalTopics > 0 ? Math.round((count / totalTopics) * 100) : 0,
        count
      }))
      .sort((a, b) => b.count - a.count)

    const topUsersData = await client
      .from('ai_chat_logs')
      .select(`
        user_id,
        employee: user_id (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    const userPromptCounts = {}
    topUsersData.data?.forEach(row => {
      const uid = row.user_id
      if (!userPromptCounts[uid]) {
        const fullName = row.employee
          ? `${row.employee.first_name || ''} ${row.employee.last_name || ''}`.trim()
          : ''
        userPromptCounts[uid] = {
          userId: uid,
          name: fullName || uid,
          count: 0
        }
      }
      userPromptCounts[uid].count++
    })

    const topUsers = Object.values(userPromptCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return res.status(200).json({
      topics,
      topUsers,
      usage: {
        today: todayCount.count || 0,
        thisWeek: weekCount.count || 0,
        thisMonth: monthCount.count || 0
      }
    })
  } catch (error) {
    console.error('[api/aiAnalytics]', error)
    return res.status(500).json({ error: 'Failed to load analytics' })
  }
}
