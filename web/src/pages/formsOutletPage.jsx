import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { supabaseClient } from '../supabase/supabaseClient'
import { alertService } from '../utils/alertService'
import { useAuth } from '../services/authContext'
import { Button, PageHeader } from '../components'
import { getLeaveForms, getBusinessForms } from '../services/messageService'
import { notificationService } from '../services/notificationService'

const LoadingState = () => (
  <div className="analytics-loading">
    <div className="analytics-loading-pulse" />
    <p>Loading forms...</p>
  </div>
)

const EmptyState = ({ title }) => (
  <div className="analytics-empty">
    <p>{title || 'No forms found.'}</p>
  </div>
)

const FormsOutletPage = () => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('leave')
  const [leaveForms, setLeaveForms] = useState([])
  const [businessForms, setBusinessForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const isAdmin = profile?.role === 'admin'

  const loadForms = async () => {
    setLoading(true)
    try {
      const [leaveData, businessData] = await Promise.all([
        getLeaveForms(),
        getBusinessForms()
      ])
      setLeaveForms(leaveData || [])
      setBusinessForms(businessData || [])
    } catch (error) {
      await alertService.error(error.message || 'Failed to load forms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForms()
  }, [])

  const updateFormStatus = async (table, id, status, form, reason = '') => {
    try {
      const { error } = await supabaseClient
        .from(table)
        .update({ status })
        .eq(table === 'leaveform' ? 'leaveform_id' : 'businessform_id', id)

      if (error) throw error

      const employeeId = form?.employee?.employee_id || form?.employee_id
      const employeeName = form?.employee
        ? `${form.employee.first_name || ''} ${form.employee.last_name || ''}`.trim()
        : 'Employee'

      const adminName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : 'Admin'

      if (employeeId) {
        const formTypeLabel = table === 'leaveform' ? 'Leave Form' : 'Official Business Form'
        const actionLabel = status === 'approved' ? 'approved' : 'rejected'
        const summary = table === 'leaveform'
          ? `${form?.type || 'Leave'} | ${form?.start_date ? new Date(form.start_date).toLocaleDateString() : ''} → ${form?.end_date ? new Date(form.end_date).toLocaleDateString() : ''}`
          : `${form?.location || 'N/A'} | ${form?.start_date ? new Date(form.start_date).toLocaleDateString() : ''} → ${form?.end_date ? new Date(form.end_date).toLocaleDateString() : ''}`

        const message = reason
          ? `${adminName} ${actionLabel} your ${formTypeLabel.toLowerCase()}. Details: ${summary}. Reason: ${reason}`
          : `${adminName} ${actionLabel} your ${formTypeLabel.toLowerCase()}. Details: ${summary}.`

        await notificationService.createNotification({
          title: `${formTypeLabel} ${actionLabel}`,
          message,
          type: table === 'leaveform' ? 'leave_form' : 'business_form',
          userId: profile?.user_id,
          notifyTo: employeeId
        })
      }

      await alertService.success(`Form ${status} successfully`)
      await loadForms()
    } catch (error) {
      await alertService.error(error.message || `Failed to update form status`)
    }
  }

  const handleStatusClick = async (table, id, status, form) => {
    const reason = window.prompt(
      `Enter a reason for ${status} (optional):`,
      ''
    )

    if (reason === null) {
      return
    }

    await updateFormStatus(table, id, status, form, reason.trim())
  }

  const filteredLeaveForms = leaveForms.filter((form) => {
    const query = searchTerm.toLowerCase()
    const name = `${form.employee?.first_name || ''} ${form.employee?.last_name || ''}`.toLowerCase()
    return (
      name.includes(query) ||
      String(form.type || '').toLowerCase().includes(query) ||
      String(form.status || '').toLowerCase().includes(query)
    )
  })

  const filteredBusinessForms = businessForms.filter((form) => {
    const query = searchTerm.toLowerCase()
    const name = `${form.employee?.first_name || ''} ${form.employee?.last_name || ''}`.toLowerCase()
    return (
      name.includes(query) ||
      String(form.location || '').toLowerCase().includes(query) ||
      String(form.status || '').toLowerCase().includes(query)
    )
  })

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <main className="content">
          <p className="permission-text">You do not have permission to view this page.</p>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Forms Outlet"
          subtitle="Review and manage submitted leave and official business forms."
          actions={[
            <input
              key="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search forms..."
              title="Search forms by employee name, type, or status"
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
            />
          ]}
        />

        <div className="forms-outlet-tabs" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setActiveTab('leave')}
            title="View leave forms"
            aria-pressed={activeTab === 'leave'}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: activeTab === 'leave' ? '2px solid #1E0977' : '1px solid #ddd',
              background: activeTab === 'leave' ? '#1E0977' : '#fff',
              color: activeTab === 'leave' ? '#fff' : '#475569',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Leave Forms
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            title="View official business forms"
            aria-pressed={activeTab === 'business'}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: activeTab === 'business' ? '2px solid #1E0977' : '1px solid #ddd',
              background: activeTab === 'business' ? '#1E0977' : '#fff',
              color: activeTab === 'business' ? '#fff' : '#475569',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Official Business
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'leave' && (
              <>
                {filteredLeaveForms.length === 0 ? (
                  <EmptyState title="No leave forms found." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredLeaveForms.map((form) => {
                      const status = String(form.status || '').toLowerCase()
                      const isPending = status === 'pending'
                      const employeeName = `${form.employee?.first_name || ''} ${form.employee?.last_name || ''}`.trim() || 'Unknown'
                      return (
                        <div
                          key={form.leaveform_id}
                          className="form-card"
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
                            <div className="form-card-title" style={{ fontWeight: 600, fontSize: 15 }}>{employeeName}</div>
                            <div className="form-card-meta" style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                              {form.type || 'Leave'} · {form.employee?.department || 'N/A'}
                            </div>
                            <div className="form-card-meta" style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                              {form.start_date ? new Date(form.start_date).toLocaleDateString() : ''} → {form.end_date ? new Date(form.end_date).toLocaleDateString() : ''}
                            </div>
                            {form.reason && (
                              <div className="form-card-meta" style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Reason: {form.reason}</div>
                            )}
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
                            <span className="form-card-status" style={{ fontSize: 13, color: '#475569', textTransform: 'capitalize' }}>
                              {status || 'pending'}
                            </span>
                            {isPending && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="sm" variant="primary" style={{ minWidth: 80 }} onClick={() => handleStatusClick('leaveform', form.leaveform_id, 'approved', form)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="danger" style={{ minWidth: 80 }} onClick={() => handleStatusClick('leaveform', form.leaveform_id, 'rejected', form)}>
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
              </>
            )}

            {activeTab === 'business' && (
              <>
                {filteredBusinessForms.length === 0 ? (
                  <EmptyState title="No official business forms found." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredBusinessForms.map((form) => {
                      const status = String(form.status || '').toLowerCase()
                      const isPending = status === 'pending'
                      const employeeName = `${form.employee?.first_name || ''} ${form.employee?.last_name || ''}`.trim() || 'Unknown'
                      return (
                        <div
                          key={form.businessform_id}
                          className="form-card"
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
                            <div className="form-card-title" style={{ fontWeight: 600, fontSize: 15 }}>{employeeName}</div>
                            <div className="form-card-meta" style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                              {form.location || 'N/A'} · {form.company_car || 'N/A'}
                            </div>
                            <div className="form-card-meta" style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                              {form.start_date ? new Date(form.start_date).toLocaleDateString() : ''} → {form.end_date ? new Date(form.end_date).toLocaleDateString() : ''}
                            </div>
                            {form.driver_name && (
                              <div className="form-card-meta" style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Driver: {form.driver_name} · {form.phone_num || ''}</div>
                            )}
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
                            <span className="form-card-status" style={{ fontSize: 13, color: '#475569', textTransform: 'capitalize' }}>
                              {status || 'pending'}
                            </span>
                            {isPending && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="sm" variant="primary" style={{ minWidth: 80 }} onClick={() => handleStatusClick('businessform', form.businessform_id, 'approved', form)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="danger" style={{ minWidth: 80 }} onClick={() => handleStatusClick('businessform', form.businessform_id, 'rejected', form)}>
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
              </>
            )}
          </>
        )}
      </main>
    </DashboardLayout>
  )
}

export default FormsOutletPage
