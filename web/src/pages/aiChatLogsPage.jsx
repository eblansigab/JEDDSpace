import { useEffect, useState } from 'react'
import { PageHeader } from '../components'
import DashboardLayout from '../layouts/dashboardLayout'
import { aiService } from '../services/aiservice'

const formatTimestamp = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const LoadingState = () => (
  <div className="analytics-loading">
    <div className="analytics-loading-pulse" />
    <p>Loading chat logs...</p>
  </div>
)

const EmptyState = () => (
  <div className="analytics-empty">
    <p>No chat logs found.</p>
  </div>
)

export default function AiChatLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      try {
        const chatLogs = await aiService.loadAllChatLogs()
        setLogs(chatLogs || [])
      } catch (err) {
        console.error('[AiChatLogsPage] Failed to load logs:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [])

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="AI Chat History"
          subtitle="All AI conversation logs for administrative oversight."
        />

        <section className="dashboard-widget">
          <div className="dashboard-widget-header">
            <h3>Conversation Log</h3>
          </div>
          <div className="dashboard-widget-body">
            {loading ? (
              <LoadingState />
            ) : logs.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="table-scroll-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Intent</th>
                      <th>Prompt</th>
                      <th>Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.chat_id}>
                        <td>{formatTimestamp(log.created_at)}</td>
                        <td>
                          {log.employee
                            ? `${log.employee.first_name || ''} ${log.employee.last_name || ''}`.trim() || 'Unknown'
                            : log.user_id || '-'}
                        </td>
                        <td>{log.intent || '-'}</td>
                        <td className="cell-wrap">{log.prompt || '-'}</td>
                        <td className="cell-wrap">{log.response || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}
