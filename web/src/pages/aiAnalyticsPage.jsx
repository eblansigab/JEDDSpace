import { useEffect, useState } from 'react'
import { PageHeader } from '../components'
import DashboardLayout from '../layouts/dashboardLayout'
import { supabaseClient } from '../supabase/supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Chart, Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const StatCard = ({ title, value, subtitle }) => (
  <div className="analytics-stat-card">
    <div className="analytics-stat-value">{value ?? 0}</div>
    <div className="analytics-stat-title">{title}</div>
    {subtitle && <div className="analytics-stat-subtitle">{subtitle}</div>}
  </div>
)

const LoadingState = () => (
  <div className="analytics-loading">
    <div className="analytics-loading-pulse" />
    <p>Loading analytics...</p>
  </div>
)

const EmptyState = ({ title }) => (
  <div className="analytics-empty">
    <p>{title || 'No data available yet.'}</p>
  </div>
)

export default function AiAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      try {
        const {
          data: { session }
        } = await supabaseClient.auth.getSession()

        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            action: 'analytics'
          })
        })
        const result = await response.json()
        const data = result?.data || result
        setAnalytics(data)
      } catch (err) {
        console.error('[AiAnalyticsPage] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  const topicData = analytics?.topics?.length
    ? {
        labels: analytics.topics.map((topic) => topic.name),
        datasets: [
          {
            label: 'Prompts',
            data: analytics.topics.map((topic) => topic.count),
            backgroundColor: [
              '#E25668', '#E28956', '#E2CF56', '#AEE256', '#68E256', '#56E289',
              '#56E2CF', '#56AEE2', '#5668E2', '#8A56E2', '#CF56E2'
            ],
            borderWidth: 0
          }
        ]
      }
    : null

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="AI Analytics"
          subtitle="Usage patterns and insights from JEDDSpace AI conversations."
        />

        {loading ? (
          <LoadingState />
        ) : !analytics ? (
          <EmptyState title="Unable to load analytics." />
        ) : (
          <>
            <section className="analytics-section">
              <h3 className="analytics-section-title">Usage Overview</h3>
              <div className="analytics-stats-grid">
                <StatCard title="Today" value={analytics.usage?.today} subtitle="prompts" />
                <StatCard title="This Week" value={analytics.usage?.thisWeek} subtitle="prompts" />
                <StatCard title="This Month" value={analytics.usage?.thisMonth} subtitle="prompts" />
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-widget">
                <div className="dashboard-widget-header">
                  <h3>Most Asked Topics</h3>
                </div>
                <div className="dashboard-widget-body">
                  {analytics.topics?.length > 0 ? (
                    <>
                      <ul className="admin-list">
                        {analytics.topics.map((topic) => (
                          <li key={topic.name}>
                            <span>{topic.name}: </span>
                            <span>{topic.percentage}% ({topic.count})</span>
                          </li>
                        ))}
                      </ul>
                      {topicData && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                          <div style={{ width: '100%', maxWidth: 320 }}>
                            <Pie 
                              data={topicData} 
                              options={plugins={
                                legend: {display: true, position: "left", align: "start"},
                                datalabels: {display: true, color: "white"}
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState title="No topic data yet." />
                  )}
                </div>
              </div>

              <div className="dashboard-widget">
                <div className="dashboard-widget-header">
                  <h3>Most Active Users</h3>
                </div>
                <div className="dashboard-widget-body">
                  {analytics.topUsers?.length > 0 ? (
                    <ul className="admin-list">
                      {analytics.topUsers.map((user) => (
                        <li key={user.userId}>
                          <span>{user.name}</span>
                          <span>{user.count} prompts</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title="No user activity yet." />
                  )}
                </div>
              </div>
            </section>

            <section className="dashboard-widget">
              <div className="dashboard-widget-header">
                <h3>AI Performance</h3>
              </div>
              <div className="dashboard-widget-body">
                {analytics.performance ? (
                  <ul className="admin-list analytics-performance-list">
                    <li><span>Measured Requests</span><span>{analytics.performance.totalMeasuredRequests}</span></li>
                    <li><span>Average Response Time</span><span>{analytics.performance.averageResponseTimeMs} ms</span></li>
                    <li><span>Average Groq Latency</span><span>{analytics.performance.averageGroqLatencyMs} ms</span></li>
                    <li><span>Average Confidence</span><span>{analytics.performance.averageConfidence}</span></li>
                    <li><span>Documents Processed</span><span>{analytics.performance.documentsProcessed}</span></li>
                    <li><span>Extraction Successes</span><span>{analytics.performance.extractionSuccesses}</span></li>
                    <li><span>Cache Hit Rate</span><span>{analytics.performance.cacheHitRate}%</span></li>
                    <li><span>Cache Hits</span><span>{analytics.performance.cacheHits}</span></li>
                    <li><span>Cache Misses</span><span>{analytics.performance.cacheMisses}</span></li>
                    <li><span>Entity Resolution Successes</span><span>{analytics.performance.entityResolutionSuccesses}</span></li>
                    <li><span>Entity Resolution Success Rate</span><span>{analytics.performance.entityResolutionSuccessRate}%</span></li>
                    <li><span>Clarification Requests</span><span>{analytics.performance.clarificationRequests}</span></li>
                    <li><span>Timeouts</span><span>{analytics.performance.timeoutCount}</span></li>
                  </ul>
                ) : (
                  <EmptyState title="No performance metrics available." />
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </DashboardLayout>
  )
}
