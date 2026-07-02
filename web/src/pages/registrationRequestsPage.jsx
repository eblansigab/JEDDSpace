import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { supabaseClient } from '../supabase/supabaseClient'
import { alertService } from '../utils/alertService'
import { useAuth } from '../services/authContext'
import { Button, PageHeader } from '../components'

const RegistrationRequestsPage = () => {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const isAdmin = profile?.role === 'admin'

  const loadRequests = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('employee')
        .select('employee_id, first_name, last_name, email, department, position, registration_status, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      await alertService.error(error.message || 'Failed to load registration requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const updateStatus = async (employeeId, status) => {
    try {
      const { error } = await supabaseClient
        .from('employee')
        .update({ registration_status: status })
        .eq('employee_id', employeeId)

      if (error) throw error

      await alertService.success(`Registration ${status} successfully`)
      await loadRequests()
    } catch (error) {
      await alertService.error(error.message || `Failed to ${status} registration`)
    }
  }

  const filteredRequests = requests.filter((req) => {
    const query = searchTerm.toLowerCase()
    const name = `${req.first_name || ''} ${req.last_name || ''}`.toLowerCase()
    return (
      name.includes(query) ||
      String(req.email || '').toLowerCase().includes(query) ||
      String(req.department || '').toLowerCase().includes(query)
    )
  })

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <main className="content">
          <p style={{ color: '#64748b' }}>You do not have permission to view this page.</p>
        </main>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="content">Loading...</main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Registration Requests"
          actions={[
            <input
              key="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search requests..."
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
            />
          ]}
        />

        {filteredRequests.length === 0 ? (
          <p style={{ color: '#64748b' }}>No registration requests found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.employee_id}>
                  <td>{req.first_name} {req.last_name}</td>
                  <td>{req.email}</td>
                  <td>{req.department || 'N/A'}</td>
                  <td>{req.position || 'N/A'}</td>
                  <td>
                    <span
                      className={`status ${String(req.registration_status || '').toLowerCase()}`}
                      style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%' }}
                    ></span>
                    {' '}
                    {req.registration_status || 'pending'}
                  </td>
                  <td>
                    {String(req.registration_status || '').toLowerCase() === 'pending' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="primary"
                          style={{ minWidth: 70 }}
                          onClick={() => updateStatus(req.employee_id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          style={{ minWidth: 70 }}
                          onClick={() => updateStatus(req.employee_id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 12 }}>No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </DashboardLayout>
  )
}

export default RegistrationRequestsPage
