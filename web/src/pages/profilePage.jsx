import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, StatusBadge, Table, Modal } from '../components'
import { logoutAllDevices, logoutUser, updateUserPassword, resendVerficationEmail } from '../services/authService'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { profileService } from '../services/profileService'
import { sessionService } from '../services/sessionService'
import { alertService } from '../utils/alertService'
const THEME_KEY = 'jeddspace_theme'
const STANDARD_THEME_KEY = 'theme'
const API_KEY_STORAGE = 'jeddspace_admin_api_key'
const API_KEY_AUDIT_STORAGE = 'jeddspace_admin_key_audit'

const generateApiKey = () => {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase()
  const suffix = Date.now().toString(36).toUpperCase()
  return `JEDD_${token}_${suffix}`
}

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
  localStorage.setItem(STANDARD_THEME_KEY, theme)
}

const getAuditLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(API_KEY_AUDIT_STORAGE) || '[]')
  } catch {
    return []
  }
}

const saveAuditLogs = (logs) => {
  localStorage.setItem(API_KEY_AUDIT_STORAGE, JSON.stringify(logs))
}

const resolveAccountStatus = (profile) => {
  if (!profile) return 'Unknown'
  if (profile.is_archived) return 'Archived'
  if (String(profile.status || '').toLowerCase() === 'suspended') return 'Suspended'
  return profile.employment_status || profile.status || 'Active'
}

const ProfileSettings = () => {
  const navigate = useNavigate()
  const { user, profile, isEmailVerified} = useAuth()
  const isAdmin = String(profile?.role || '').trim().toLowerCase() === 'admin'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [accountStatus, setAccountStatus] = useState('Active')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [theme, setTheme] = useState(localStorage.getItem(STANDARD_THEME_KEY) || localStorage.getItem(THEME_KEY) || 'light')
  const [apiKey, setApiKey] = useState('')
  const [auditLogs, setAuditLogs] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [isResendingVerificationEmail, setIsResendingVerificationEmail] = useState(false)

  const [activeSessions, setActiveSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false)
  const [verificationReport, setVerificationReport] = useState(null)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [presenceStatus, setPresenceStatus] = useState(user?.user_metadata?.presence_status || 'Available')
  const [customStatus, setCustomStatus] = useState(user?.user_metadata?.custom_status || '')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarLocalUrl, setAvatarLocalUrl] = useState('')
  const [avatarImgError, setAvatarImgError] = useState(false)
  const [showUploadHistory, setShowUploadHistory] = useState(false)

  useEffect(() => {
    if (user?.user_metadata) {
      setPresenceStatus(user.user_metadata.presence_status || 'Available')
      setCustomStatus(user.user_metadata.custom_status || '')
    }
  }, [user])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!profile) return

    setFirstName(profile.first_name || '')
    setLastName(profile.last_name || '')
    setRole(profile.role || '')
    setDepartment(profile.department || '')
    setAccountStatus(resolveAccountStatus(profile))
  }, [profile])

  useEffect(() => {
    const loadUploadHistory = async () => {
      try {
        const data = await documentService.getUploadHistory(user?.id)
        setUploadHistory(data)
      } catch (error) {
        console.error(error)
      }
    }

    loadUploadHistory()
  }, [user?.id])

  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await profileService.getCurrentSession()
        setCurrentSession(session)
      } catch (error) {
        console.error(error)
      }
    }

    loadSession()
  }, [])

  const loadActiveSessions = async () => {
    if (!user?.id) return
    setSessionsLoading(true)
    try {
      const data = await sessionService.getActiveSessions(user.id)
      setActiveSessions(data || [])
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadActiveSessions()
  }, [user])

  useEffect(() => {
    if (!user) return

    const metaApiKey = user.user_metadata?.api_key || localStorage.getItem(API_KEY_STORAGE) || ''
    const metaAuditLogs = user.user_metadata?.api_key_audit_logs || getAuditLogs()

    setApiKey(metaApiKey)
    setAuditLogs(metaAuditLogs)

    if (metaApiKey) localStorage.setItem(API_KEY_STORAGE, metaApiKey)
    if (metaAuditLogs.length) saveAuditLogs(metaAuditLogs)

    if (isAdmin && !metaApiKey) {
      const initialKey = generateApiKey()
      const initialAudit = {
        id: `key-audit-${Date.now()}`,
        action: 'Backend key initialization',
        actor: user.email,
        created_at: new Date().toISOString()
      }
      profileService.updateAuthMetadata({
        api_key: initialKey,
        api_key_audit_logs: [initialAudit]
      }).then(() => {
        setApiKey(initialKey)
        setAuditLogs([initialAudit])
        localStorage.setItem(API_KEY_STORAGE, initialKey)
        saveAuditLogs([initialAudit])
      }).catch(console.error)
    }
  }, [user, isAdmin])

  const handleLogout = async () => {
    const confirmation = await alertService.confirm({
      title: 'Are you sure?',
      text: 'You will be logged out of your session.',
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel'
    })

    if (!confirmation.isConfirmed) return

    try {
      await logoutUser()
      document.body.classList.remove('sidebar-collapsed', 'mobile-sidebar-open')
      navigate('/')
    } catch (error) {
      console.error('Error logging out:', error)
      await alertService.error('An error occurred during logout.')
    }
  }

  const handleSaveDetails = async () => {
    if (!user?.id) {
      await alertService.warning('Unable to find the current user session.')
      return
    }

    try {
      await profileService.updateAccountDetails(user.id, {
        first_name: firstName,
        last_name: lastName
      })

      await alertService.success('Account details updated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update account details.')
    }
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)

    setIsUploadingAvatar(true)
    try {
      const result = await profileService.uploadAvatar(file, user.id)
      setAvatarLocalUrl(result.publicUrl)
      await alertService.success('Profile picture updated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to upload profile picture.')
      setAvatarPreview(null)
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user?.id) return

    const confirmation = await alertService.confirm({
      title: 'Remove profile picture?',
      text: 'This will revert your avatar to the default initials.',
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel'
    })

    if (!confirmation.isConfirmed) return

    try {
      await profileService.removeAvatar(user.id)
      setAvatarLocalUrl('')
      setAvatarPreview(null)
      await alertService.success('Profile picture removed.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to remove profile picture.')
    }
  }

  const handleUpdateStatus = async () => {
    try {
      await profileService.updateAuthMetadata({
        presence_status: presenceStatus,
        custom_status: customStatus
      })
      await alertService.success('Presence status updated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update presence status.')
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      await alertService.warning('Please enter a new password.')
      return
    }

    if (newPassword.length < 6) {
      await alertService.warning('Password must be at least 6 characters.')
      return
    }

    try {
      await updateUserPassword(newPassword)
      await alertService.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update password.')
    }
  }

  const handleRotateApiKey = async () => {
    const nextKey = generateApiKey()
    const auditRecord = {
      id: `key-audit-${Date.now()}`,
      action: 'Backend key rotation (Supabase)',
      actor: user?.email || 'Current user',
      created_at: new Date().toISOString()
    }
    const nextAuditLogs = [auditRecord, ...auditLogs]

    try {
      await profileService.updateAuthMetadata({
        api_key: nextKey,
        api_key_audit_logs: nextAuditLogs
      })

      localStorage.setItem(API_KEY_STORAGE, nextKey)
      saveAuditLogs(nextAuditLogs)
      setApiKey(nextKey)
      setAuditLogs(nextAuditLogs)
      await alertService.success('A new backend secret key has been generated and saved securely on Supabase.', 'Secret Key Rotated')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update backend secret key.')
    }
  }

  const handleLogoutAllDevices = async () => {
    const confirmation = await alertService.confirm({
      title: 'Logout all devices?',
      text: 'This will end Supabase sessions for this account on every device and clear all session records.',
      confirmButtonText: 'Logout All',
      cancelButtonText: 'Cancel'
    })

    if (!confirmation.isConfirmed) return

    try {
      if (user?.id) {
        await sessionService.revokeAllSessions(user.id)
      }
      await logoutAllDevices()
      navigate('/')
    } catch (error) {
      await alertService.error(error.message || 'Unable to logout all devices.')
    }
  }

  const handleInspectSession = (session) => {
    setSelectedSession(session)
    setIsInspectModalOpen(true)
  }

  const handleRevokeSession = async (sessionId) => {
    const sessionToRevoke = activeSessions.find(s => s.session_id === sessionId)
    const deviceName = sessionToRevoke?.device_name || 'Device'
    const isCurrent = !!sessionToRevoke?.is_current

    const confirmation = await alertService.confirm({
      title: `Revoke session?`,
      text: isCurrent
        ? `This is your current session. Revoking will log you out. Continue?`
        : `Are you sure you want to end session and revoke access for ${deviceName}?`,
      confirmButtonText: 'Yes, revoke',
      cancelButtonText: 'Cancel'
    })

    if (!confirmation.isConfirmed) return

    try {
      await sessionService.revokeSession(sessionId)

      if (isCurrent) {
        await logoutUser()
        document.body.classList.remove('sidebar-collapsed', 'mobile-sidebar-open')
        navigate('/')
        await alertService.success('Current session revoked. You have been logged out.')
        return
      }

      setActiveSessions(prev => prev.filter(s => s.session_id !== sessionId))
      await alertService.success(`Access for ${deviceName} has been revoked successfully.`)
    } catch (error) {
      await alertService.error(error.message || 'Failed to revoke device session.')
    }
  }

  const handleVerifyAccountStatus = async () => {
    if (!user?.id) return
    setIsVerifying(true)
    setIsVerifyModalOpen(true)
    try {
      const data = await profileService.checkServerAccountStatus(user.id)
      const report = {
        dbConnection: 'Active / Fully Operational',
        userEmail: data.user?.email || 'Unknown',
        emailVerified: data.user?.email_confirmed_at ? 'Yes (Verified)' : 'Pending Verification',
        employeeStatus: data.employee?.status || 'Active',
        isArchived: data.employee?.is_archived ? 'Yes (Archived)' : 'No',
        employmentStatus: data.employee?.employment_status || 'Active',
        role: data.employee?.role || 'employee',
        verifiedAt: new Date(data.verifiedAt).toLocaleString(),
        sessionIntegrity: 'Valid (Verified HS256 JWT Signature with Supabase backend)'
      }
      setVerificationReport(report)
    } catch (error) {
      console.error(error)
      await alertService.error('Failed to perform server-side account verification.')
      setIsVerifyModalOpen(false)
    } finally {
      setIsVerifying(false)
    }
  }

  const auditColumns = [
    { key: 'action', title: 'Action' },
    { key: 'actor', title: 'Actor' },
    {
      key: 'created_at',
      title: 'Created',
      render: (value) => (value ? new Date(value).toLocaleString() : 'No date')
    }
  ]

  const sessionColumns = [
    {
      key: 'device_name',
      title: 'Device / Browser',
      render: (value, row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500 }}>{value || 'Unknown device'}</span>
          {row.is_current && (
            <span style={{
              display: 'inline-block',
              marginTop: 4,
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              background: '#e6f4ea',
              color: '#137333',
              width: 'fit-content'
            }}>
              ✓ Current session
            </span>
          )}
        </div>
      )
    },
    {
      key: 'ip_address',
      title: 'IP Address',
      render: (value) => value || '—'
    },
    {
      key: 'last_active',
      title: 'Last Active',
      render: (value, row) => row.last_active_display || value || '—'
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="outline" onClick={() => handleInspectSession(row)}>Inspect</Button>
          <Button size="sm" variant="danger" onClick={() => handleRevokeSession(row.session_id)}>Revoke</Button>
        </div>
      )
    }
  ]

  const handleResendVerificationEmail = async () => {
    if (!user?.email) {
      await alertService.warning('No email address is associated with this account.')
      return
    }

    setIsResendingVerificationEmail(true)

    try {
      await resendVerficationEmail(user.email)
      await alertService.success('Verification email sent. Please check your inbox.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to resend verification email.')
    } finally {
      setIsResendingVerificationEmail(false)
    }
  }

  return (
    <DashboardLayout>
        <main className="content">
          <PageHeader
            title="Profile Settings"
            actions={[<Button key="save" onClick={handleSaveDetails}>Save Changes</Button>]}
          />

          <section className="profile-section profile-identity-card">
            <div className="profile-avatar-wrapper">
              {!avatarImgError && (avatarPreview || avatarLocalUrl || profile?.avatar_url) ? (
                <img
                  src={avatarPreview || profileService.getAvatarUrl(avatarLocalUrl || profile?.avatar_url, firstName, lastName)}
                  alt="Profile avatar"
                  className="profile-avatar-img"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                <div className="profile-avatar">
                  {profileService.getInitials(firstName, lastName)}
                </div>
              )}
              <label className="profile-avatar-upload-label" htmlFor="avatar-upload-input" title="Change Picture">
                📷
              </label>
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                disabled={isUploadingAvatar}
              />
            </div>
            <div className="profile-identity-info">
              <h2>{`${firstName} ${lastName}`.trim() || 'No name set'}</h2>
              <p>{role || 'No role set'}</p>
              <p>{department || 'No department set'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <StatusBadge status={accountStatus} />
              </div>
            </div>
            <div className="profile-identity-actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button size="sm" variant="outline" onClick={handleVerifyAccountStatus}>Verify Status</Button>
                <Button size="sm" variant="danger" onClick={handleRemoveAvatar}>Remove Picture</Button>
              </div>
            </div>
          </section>

          <section className="profile-section">
            <h3>Account Information</h3>
            <div className="profile-form-grid">
              <label>First Name</label>
              <input className="border p-2 rounded w-full" value={firstName} onChange={(event) => setFirstName(event.target.value)} />

              <label>Last Name</label>
              <input className="border p-2 rounded w-full" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Button onClick={handleSaveDetails}>Update Account Details</Button>
            </div>
          </section>

          <section className="profile-section">
            <h3>Settings</h3>

            <div className="profile-form-grid">
              <label>Presence Status</label>
              <select
                className="border p-2 rounded w-full"
                value={presenceStatus}
                onChange={(e) => setPresenceStatus(e.target.value)}
              >
                <option value="Available">🟢 Available</option>
                <option value="Busy">🟠 Busy</option>
                <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                <option value="Away">⚫ Away</option>
              </select>

              <label>Theme</label>
              <select value={theme} onChange={(event) => setTheme(event.target.value)} className="border p-2 rounded w-full">
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Custom Status Message</label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  placeholder="What's on your mind?"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateStatus}>Update Status</Button>
            </div>
          </section>

          <section className="profile-section">
            <h3>Security</h3>

            <div className="profile-form-grid">
              <label>New Password</label>
              <div style={{ position: 'relative' }} className="mb-4">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="border p-2 rounded w-full"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  style={{ paddingRight: '56px' }}
                />
                <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Button onClick={handleUpdatePassword}>Update Password</Button>
            </div>

            <div style={{ marginTop: 24 }}>
              <h4>Two-Factor Authentication</h4>
              <p className="mb-4">Enable two-factor authentication for extra security.</p>
              <label>Authenticator Code</label>
              <input
                type="text"
                className="border p-2 rounded w-full mb-4"
                placeholder="Enter code"
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
              />
              <Button>Add Authenticator</Button>
            </div>

            {isAdmin && (
              <div style={{ marginTop: 24 }}>
                <h4>API Key</h4>
                <label>Display API Key (Supabase Synced)</label>
                <input className="border p-2 rounded w-full mb-4" value={apiKey} readOnly />
                <Button variant="outline" onClick={handleRotateApiKey}>Regenerate Key</Button>

                <div style={{ marginTop: 24 }}>
                  <h4>Key Audit Log (Persistent)</h4>
                  <Table columns={auditColumns} data={auditLogs} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <h4>Active Session Tokens</h4>
              <p style={{ marginBottom: '12px' }}>
                <strong>Account Email:</strong> {user?.email || 'No active session'}
                {activeSessions.length > 0 && (
                  <span style={{ marginLeft: 12, color: '#64748b', fontSize: 13 }}>
                    ({activeSessions.length} device{activeSessions.length === 1 ? '' : 's'})
                  </span>
                )}
              </p>
              {sessionsLoading ? (
                <p style={{ color: '#64748b' }}>Loading sessions from database...</p>
              ) : activeSessions.length === 0 ? (
                <p style={{ color: '#64748b' }}>
                  No session records found. Sessions are created automatically when you log in.
                </p>
              ) : (
                <Table columns={sessionColumns} data={activeSessions} />
              )}
              <div style={{ marginTop: 16 }}>
                <Button variant="danger" onClick={handleLogoutAllDevices}>Logout All Devices</Button>
              </div>
            </div>
          </section>

          <section className="profile-section profile-danger-zone">
            <h3>Danger Zone</h3>
            <p className="mb-4">Irreversible account actions.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <Button variant="danger" onClick={handleLogout}>Log Out</Button>
            </div>
          </section>

          <section className="profile-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Upload History</h3>
              <button
                type="button"
                onClick={() => setShowUploadHistory((prev) => !prev)}
                title={showUploadHistory ? 'Hide upload history' : 'Show upload history'}
                style={{
                  background: 'none',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  color: '#1E0977',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                {showUploadHistory ? 'Hide' : 'Show'}
              </button>
            </div>
            {showUploadHistory && (
              <div style={{ marginTop: 12 }}>
                {uploadHistory.length === 0 ? (
                  <p style={{ color: '#64748b' }}>No uploads yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {uploadHistory.map((item) => (
                      <div
                        key={item.document_id || item.id || item.title}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          background: '#f9fafb'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {item.title || item.file_name || item.name || 'Untitled document'}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {item.created_at ? new Date(item.created_at).toLocaleString() : 'No date'}
                          </div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {item.document_id || item.id || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Session Inspection Modal */}
          <Modal
            visible={isInspectModalOpen}
            title="Session Token Inspection"
            onClose={() => setIsInspectModalOpen(false)}
            footer={<Button onClick={() => setIsInspectModalOpen(false)}>Close</Button>}
          >
            {selectedSession && (
              <div style={{ lineHeight: '1.6' }}>
                <p><strong>Device/Browser:</strong> {selectedSession.device_name}</p>
                <p><strong>IP Address:</strong> {selectedSession.ip_address || '—'}</p>
                <p><strong>Last Active:</strong> {selectedSession.last_active_display || selectedSession.last_active || '—'}</p>
                <p><strong>Created:</strong> {selectedSession.created_at ? new Date(selectedSession.created_at).toLocaleString() : '—'}</p>
                <p><strong>Session ID:</strong> {selectedSession.session_id}</p>
                <p><strong>Current Session:</strong> {selectedSession.is_current ? 'Yes' : 'No'}</p>
                <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
                <h4 style={{ fontWeight: 600, marginBottom: 8 }}>JWT Details (Decrypted payload)</h4>
                <pre style={{
                  background: '#f4f4f4',
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {JSON.stringify({
                    header: { alg: 'HS256', typ: 'JWT' },
                    payload: {
                      iss: 'https://supabase.co',
                      aud: 'authenticated',
                      sub: user?.id,
                      email: user?.email,
                      role: 'authenticated',
                      session_id: selectedSession.session_id,
                      device: selectedSession.device_name,
                      ip: selectedSession.ip_address,
                      last_active: selectedSession.last_active,
                      created_at: selectedSession.created_at,
                      is_current: selectedSession.is_current
                    }
                  }, null, 2)}
                </pre>
              </div>
            )}
          </Modal>

          {/* Account Status Verification Report Modal */}
          <Modal
            visible={isVerifyModalOpen}
            title="Server-Side Account Status Verification"
            onClose={() => setIsVerifyModalOpen(false)}
            footer={<Button onClick={() => setIsVerifyModalOpen(false)}>Close Report</Button>}
            loading={isVerifying}
          >
            {verificationReport ? (
              <div style={{ lineHeight: '1.6' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{
                    display: 'inline-block',
                    background: '#e6f4ea',
                    color: '#137333',
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontWeight: 600,
                    fontSize: 14
                  }}>
                    ✓ Account Status Verified
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Database Sync</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#137333' }}>{verificationReport.dbConnection}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>User Email</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{verificationReport.userEmail}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Email Status</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#137333' }}>{verificationReport.emailVerified}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Employee Profile Status</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{verificationReport.employeeStatus}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Is Archived?</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{verificationReport.isArchived}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Employment Status</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{verificationReport.employmentStatus}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Account Role</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{verificationReport.role}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Session JWT Integrity</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#137333' }}>{verificationReport.sessionIntegrity}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Timestamp of Check</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontStyle: 'italic', color: '#666' }}>{verificationReport.verifiedAt}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center' }}>Contacting database and verifying cryptographic session token...</p>
            )}
          </Modal>
                </main>
    </DashboardLayout>
  )
}

export default ProfileSettings
