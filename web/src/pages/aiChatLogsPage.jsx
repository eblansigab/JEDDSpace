import { useEffect, useState } from 'react'
import { PageHeader } from '../components'
import DashboardLayout from '../layouts/dashboardLayout'
import { aiService } from '../services/aiservice'

export default function AiChatLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      try {
        const chatLogs = await aiService.loadAllChatLogs()
        setLogs(chatLogs)
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
              <p>Loading...</p>
            ) : logs.length === 0 ? (
              <p>No chat logs found.</p>
            ) : (
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
                      <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                      <td>
                        {log.employee
                          ? `${log.employee.first_name || ''} ${log.employee.last_name || ''}`.trim() || 'Unknown'
                          : log.user_id || '-'}
                      </td>
                      <td>{log.intent || '-'}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.prompt || '-'}
                      </td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.response || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}