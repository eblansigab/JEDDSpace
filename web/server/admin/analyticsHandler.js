import { getSupabaseServerClient } from '../ai/supabaseClient.js'

export const handleAnalytics = async ({ viewer }) => {
  if (!viewer?.isAdmin) {
    return { status: viewer?.user?.id ? 403 : 401, error: 'Admin access required' }
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
      .gte('created_at', monthStart.toISOString()),
  ])

  const topicStats = {}
  intentCounts.data?.forEach((row) => {
    const intent = row.intent || 'other'
    topicStats[intent] = (topicStats[intent] || 0) + 1
  })

  const totalTopics = Object.values(topicStats).reduce((a, b) => a + b, 0)
  const topics = Object.entries(topicStats)
    .map(([name, count]) => ({
      name,
      percentage: totalTopics > 0 ? Math.round((count / totalTopics) * 100) : 0,
      count,
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
  topUsersData.data?.forEach((row) => {
    const uid = row.user_id
    if (!userPromptCounts[uid]) {
      const fullName = row.employee
        ? `${row.employee.first_name || ''} ${row.employee.last_name || ''}`.trim()
        : ''
      userPromptCounts[uid] = {
        userId: uid,
        name: fullName || uid,
        count: 0,
      }
    }
    userPromptCounts[uid].count++
  })

  const topUsers = Object.values(userPromptCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const metricsResponse = await client
    .from('ai_summarization')
    .select('raw_data_snapshot, created_at')
    .like('reference_type', 'ai_metric_%')
    .order('created_at', { ascending: false })
    .limit(200)

  const metricRows = (metricsResponse.data || [])
    .map((row) => {
      try {
        return JSON.parse(row.raw_data_snapshot || '{}')
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const average = (values) => {
    const numeric = values.filter((value) => Number.isFinite(Number(value))).map(Number)
    if (!numeric.length) return 0
    return Math.round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length)
  }

  const allStages = metricRows.flatMap((metric) => metric.stages || [])
  const confidenceValues = metricRows.flatMap((metric) => {
    const entities = Object.values(metric.referencedEntities || {})
    return entities
      .map((entity) => entity?.confidence)
      .filter((confidence) => Number.isFinite(Number(confidence)))
  })
  const cacheHits = allStages.filter((stage) => stage.cached === true).length
  const cacheMisses = allStages.filter((stage) => stage.cached === false).length
  const timeoutCount = allStages.filter((stage) => String(stage.error || '').toLowerCase().includes('timeout')).length
  const clarificationRequests = metricRows.filter((metric) =>
    (metric.warnings || []).some((warning) => String(warning).toLowerCase().includes('low confidence'))
  ).length
  const documentsProcessed = allStages.filter((stage) => String(stage.stage || '').includes('document:extract:complete')).length
  const entityResolutionSuccesses = metricRows.filter((metric) => metric.entityResolutionSucceeded).length

  return {
    data: {
      topics,
      topUsers,
      usage: {
        today: todayCount.count || 0,
        thisWeek: weekCount.count || 0,
        thisMonth: monthCount.count || 0,
      },
      performance: {
        totalMeasuredRequests: metricRows.length,
        averageResponseTimeMs: average(metricRows.map((metric) => metric.totalLatencyMs)),
        averageGroqLatencyMs: average(metricRows.map((metric) => metric.groqLatencyMs)),
        averageConfidence: confidenceValues.length
          ? Number((confidenceValues.reduce((sum, value) => sum + Number(value), 0) / confidenceValues.length).toFixed(2))
          : 0,
        cacheHits,
        cacheMisses,
        cacheHitRate: cacheHits + cacheMisses > 0 ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 100) : 0,
        documentsProcessed,
        extractionSuccesses: documentsProcessed,
        entityResolutionSuccesses,
        entityResolutionSuccessRate: metricRows.length > 0 ? Math.round((entityResolutionSuccesses / metricRows.length) * 100) : 0,
        timeoutCount,
        clarificationRequests,
      },
    },
  }
}
