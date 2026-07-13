/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { supabaseClient } from '../supabase/supabaseClient'
import { alertService } from '../utils/alertService'
import { usePermissions } from '../contexts/PermissionContext'
import { Button, PageHeader } from '../components'

const LoadingState = () => (
  <div className="analytics-loading">
    <div className="analytics-loading-pulse" />
    <p>Loading registration requests...</p>
  </div>
)

const EmptyState = () => (
  <div className="analytics-empty">
    <p>No registration requests found.</p>
  </div>
)

const RegistrationRequestsPage = () => {
  const { hasPermission } = usePermissions()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const isAdmin = hasPermission('settings.manage')

  const loadRequests = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('employee')
        .select('employee_id, first_name, last_name, username, department, position, registration_status, created_at')
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
      String(req.username || '').toLowerCase().includes(query) ||
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
        <main className="content">
          <LoadingState />
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Registration Requests"
          subtitle="Review and approve new account registrations."
          actions={[
            <input
              key="search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search requests..."
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
            />
          ]}
        />

        {filteredRequests.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredRequests.map((req) => {
              const status = String(req.registration_status || 'pending').toLowerCase()
              const isPending = status === 'pending'
              const name = `${req.first_name || ''} ${req.last_name || ''}`.trim() || 'Unknown'
              const details = [req.department, req.position].filter(Boolean).join(' · ')

              return (
                <div
                  key={req.employee_id}
                  className="registration-request-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '16px 18px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
                    <div className="registration-request-meta" style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                      @{req.username || 'not_set'} {details ? `· ${details}` : ''}
                    </div>
                    <div className="registration-request-meta" style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      Requested on {req.created_at ? new Date(req.created_at).toLocaleString() : 'Unknown date'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span
                      className={`status ${status}`}
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%'
                      }}
                    />
                    <span className="registration-request-status" style={{ fontSize: 13, color: '#475569', textTransform: 'capitalize' }}>
                      {status}
                    </span>
                    {isPending && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          size="sm"
                          variant="primary"
                          style={{ minWidth: 80 }}
                          onClick={() => updateStatus(req.employee_id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          style={{ minWidth: 80 }}
                          onClick={() => updateStatus(req.employee_id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}

export default RegistrationRequestsPage
