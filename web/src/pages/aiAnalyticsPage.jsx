import { useEffect, useState } from 'react'
import { PageHeader } from '../components'
import DashboardLayout from '../layouts/dashboardLayout'
import { supabaseClient } from '../supabase/supabaseClient'

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

        const response = await fetch('/api/aiAnalytics', {
          headers: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          }
        })
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        console.error('[AiAnalyticsPage] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="AI Analytics"
          subtitle="Usage patterns and insights from AI conversations."
        />

        <section className="dashboard-grid">
          <div className="dashboard-widget">
            <div className="dashboard-widget-header">
              <h3>Most Asked Topics</h3>
            </div>
            <div className="dashboard-widget-body">
              {loading ? (
                <p>Loading...</p>
              ) : analytics?.topics?.length > 0 ? (
                <ul className="admin-list">
                  {analytics.topics.map((topic) => (
                    <li key={topic.name}>
                      <span>{topic.name}</span>
                      <span>{topic.percentage}% ({topic.count})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No data available.</p>
              )}
            </div>
          </div>

          <div className="dashboard-widget">
            <div className="dashboard-widget-header">
              <h3>Most Active Users</h3>
            </div>
            <div className="dashboard-widget-body">
              {loading ? (
                <p>Loading...</p>
              ) : analytics?.topUsers?.length > 0 ? (
                <ul className="admin-list">
                  {analytics.topUsers.map((user) => (
                    <li key={user.userId}>
                      <span>{user.name}</span>
                      <span>{user.count} prompts</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No data available.</p>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-widget">
          <div className="dashboard-widget-header">
            <h3>Average AI Usage</h3>
          </div>
          <div className="dashboard-widget-body">
            {loading ? (
              <p>Loading...</p>
            ) : analytics?.usage ? (
              <ul className="admin-list">
                <li>Today: {analytics.usage.today} prompts</li>
                <li>This Week: {analytics.usage.thisWeek} prompts</li>
                <li>This Month: {analytics.usage.thisMonth} prompts</li>
              </ul>
            ) : (
              <p>No data available.</p>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
