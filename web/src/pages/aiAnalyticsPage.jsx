import { useEffect, useState } from 'react'
import { PageHeader } from '../components'
import DashboardLayout from '../layouts/dashboardLayout'
import { supabaseClient } from '../supabase/supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'

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

  const topicData = {
    labels: analytics?.topics.name,
    datasets: [{
      label: "No. of Prompts:",
      data: analytics?.topics.count,
      backgroundColor: [
        "#1e0977","#47007b","#650077","#7c0070","#91006a","#a50064",
        "#b9005d","#cc0053","#e00045","#f3002e","#ff0000"
      ],
      borderWidth: 0,
    }]
  }

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
                <React.Fragment>
                <ul className="admin-list">
                  {analytics.topics.map((topic) => (
                    <li key={topic.name}>
                      <span>{topic.name}</span>
                      <span>{topic.percentage}% ({topic.count})</span>
                    </li>
                  ))}
                </ul>
                <Pie data={topicData} />
                </React.Fragment>
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
                <React.Fragment>
                <ul className="admin-list">
                  {analytics.topUsers.map((user) => (
                    <li key={user.userId}>
                      <span>{user.name}</span>
                      <span>{user.count} prompts</span>
                    </li>
                  ))}
                </ul>
                {analytics.topUsers.map((user) => (
                  <p key={user.userId}><strong>{user.name}:</strong> {user.count} prompts</p>
                ))}
                </React.Fragment>
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
              <React.Fragment>
              <ul className="admin-list">
                <li>Today: {analytics.usage.today} prompts</li>
                <li>This Week: {analytics.usage.thisWeek} prompts</li>
                <li>This Month: {analytics.usage.thisMonth} prompts</li>
              </ul>
              <p><strong>Today:</strong> {analytics.usage.today} prompts</p>
              <p><strong>This Week:</strong> {analytics.usage.thisWeek} prompts</p>
              <p><strong>This Month:</strong> {analytics.usage.thisMonth} prompts</p>
              </React.Fragment>
            ) : (
              <p>No data available.</p>
            )}
          </div>
        </section>

        <section className="dashboard-widget">
          <div className="dashboard-widget-header">
            <h3>AI Performance</h3>
          </div>
          <div className="dashboard-widget-body">
            {loading ? (
              <p>Loading...</p>
            ) : analytics?.performance ? (
              <React.Fragment>
              <ul className="admin-list">
                <li>Measured Requests: {analytics.performance.totalMeasuredRequests}</li>
                <li>Average Response Time: {analytics.performance.averageResponseTimeMs} ms</li>
                <li>Average Groq Latency: {analytics.performance.averageGroqLatencyMs} ms</li>
                <li>Average Confidence: {analytics.performance.averageConfidence}</li>
                <li>Documents Processed: {analytics.performance.documentsProcessed}</li>
                <li>Extraction Successes: {analytics.performance.extractionSuccesses}</li>
                <li>Cache Hit Rate: {analytics.performance.cacheHitRate}%</li>
                <li>Cache Hits: {analytics.performance.cacheHits}</li>
                <li>Cache Misses: {analytics.performance.cacheMisses}</li>
                <li>Entity Resolution Successes: {analytics.performance.entityResolutionSuccesses}</li>
                <li>Entity Resolution Success Rate: {analytics.performance.entityResolutionSuccessRate}%</li>
                <li>Clarification Requests: {analytics.performance.clarificationRequests}</li>
                <li>Timeouts: {analytics.performance.timeoutCount}</li>
              </ul>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div style={{width:'45%'}}>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Measured Requests</p>
                    <p>{analytics.performance.totalMeasuredRequests}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Average Response Time</p>
                    <p>{analytics.performance.averageResponseTimeMs}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Average Groq Latency</p>
                    <p>{analytics.performance.averageGroqLatencyMs}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Average Confidence</p>
                    <p>{analytics.performance.averageConfidence}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Documents Processed</p>
                    <p>{analytics.performance.documentsProcessed}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Extraction Successes</p>
                    <p>{analytics.performance.extractionSuccesses}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between',marginBottom:'0'}}>
                    <p style={{fontWeight:'bold'}}>Cache Hit Rate</p>
                    <p>{analytics.performance.cacheHitRate}</p>
                  </div>
                </div>
                <div style={{width:'45%'}}>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Cache Hits</p>
                    <p>{analytics.performance.cacheHits}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Cache Misses</p>
                    <p>{analytics.performance.cacheMisses}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Entity Resolution Successes</p>
                    <p>{analytics.performance.entityResolutionSuccesses}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Entity Resolution Success Rate</p>
                    <p>{analytics.performance.entityResolutionSuccessRate}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between'}}>
                    <p style={{fontWeight:'bold'}}>Clarification Requests</p>
                    <p>{analytics.performance.clarificationRequests}</p>
                  </div>
                  <div style={{display:'flex',width:'100%',justifyContent:'space-between',marginBottom:'0'}}>
                    <p style={{fontWeight:'bold'}}>Timeouts</p>
                    <p>{analytics.performance.timeoutCount}</p>
                  </div>
                </div>
              </div>
              </React.Fragment>
            ) : (
              <p>No performance metrics available.</p>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
