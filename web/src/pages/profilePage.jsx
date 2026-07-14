/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, StatusBadge, Table, Modal } from '../components'
import { logoutAllDevices, logoutUser, updateUserPassword } from '../services/authService'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { employeeService } from '../services/employeeService'
import { profileService } from '../services/profileService'
import { sessionService } from '../services/sessionService'
import { alertService } from '../utils/alertService'
import { DEPARTMENT_OPTIONS, POSITION_OPTIONS } from '../constants/formOptions'
import { usePermissions } from '../contexts/PermissionContext'
import { supabaseClient } from '../supabase/supabaseClient'

const THEME_KEY = 'jeddspace_theme'
const STANDARD_THEME_KEY = 'theme'
const API_KEY_STORAGE = 'jeddspace_admin_api_key'
const API_KEY_AUDIT_STORAGE = 'jeddspace_admin_key_audit'
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
  localStorage.setItem(STANDARD_THEME_KEY, theme)
}

const generateApiKey = () => {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase()
  const suffix = Date.now().toString(36).toUpperCase()
  return `JEDD_${token}_${suffix}`
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

const normalizeUsername = (value) => String(value || '').trim().toLowerCase()

const resolveAccountStatus = (profile) => {
  if (!profile) return 'Unknown'
  if (profile.is_archived) return 'Archived'
  if (profile.registration_status) return profile.registration_status
  return profile.employment_status || profile.status || 'Active'
}

const ProfileField = ({ label, help, children }) => (
  <div className="profile-field">
    <label>{label}</label>
    {children}
    {help && (
      <p className="profile-field-help">
        {help}
      </p>
    )}
  </div>
)

const ProfileSettings = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { hasPermission } = usePermissions()
  const isAdmin = hasPermission('EMP_PROFILE')

  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [registrationStatus, setRegistrationStatus] = useState('approved')
  const [employmentStatus, setEmploymentStatus] = useState('active')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [theme, setTheme] = useState(localStorage.getItem(STANDARD_THEME_KEY) || localStorage.getItem(THEME_KEY) || 'light')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarLocalUrl, setAvatarLocalUrl] = useState('')
  const [avatarImgError, setAvatarImgError] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [showUploadHistory, setShowUploadHistory] = useState(false)
  const [showActiveSessions, setShowActiveSessions] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [auditLogs, setAuditLogs] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!profile) return

    setUsername(profile.username || '')
    setFirstName(profile.first_name || '')
    setLastName(profile.last_name || '')
    setDepartment(profile.department || '')
    setPosition(profile.position || '')
    setRegistrationStatus(profile.registration_status || 'approved')
    setEmploymentStatus(profile.employment_status)
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

    if (user?.id) loadUploadHistory()
  }, [user?.id])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSaveDetails = async () => {
    if (!isAdmin) {
      await alertService.warning('Legal identity information is managed by HR.')
      return
    }

    if (!profile?.employee_id) {
      await alertService.warning('Unable to find the current employee record.')
      return
    }

    const normalizedUsername = normalizeUsername(username)
    if (!normalizedUsername || !USERNAME_PATTERN.test(normalizedUsername)) {
      await alertService.warning('Username must be 3-30 lowercase letters, numbers, or underscores with no spaces.')
      return
    }

    const duplicate = (await employeeService.getAll()).find((employee) =>
      String(employee.username || '').trim().toLowerCase() === normalizedUsername &&
      employee.employee_id !== profile.employee_id
    )

    if (duplicate) {
      await alertService.warning('Username is already taken.')
      return
    }

    try {
      await employeeService.update(profile.employee_id, {
        username: normalizedUsername,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        department: department.trim(),
        position: position.trim(),
        registration_status: registrationStatus,
        employment_status: employmentStatus,
      })

      await alertService.success('Profile details updated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update profile details.')
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
      setAvatarImgError(false)
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
      setNewPassword('')
      await alertService.success('Password updated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update password.')
    }
  }

  const handleLogout = async () => {
    const confirmation = await alertService.confirm({
      title: 'Log out?',
      text: 'You will be logged out of your session.',
      confirmButtonText: 'Log out',
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

  const handleRotateApiKey = async () => {
    const confirmation = await alertService.confirm({
      title: 'Regenerate API Key?',
      text: 'This will invalidate the current key. Any applications using it will stop working until updated.',
      confirmButtonText: 'Regenerate',
      cancelButtonText: 'Cancel'
    })

    if (!confirmation.isConfirmed) return

    const newKey = generateApiKey()
    const newAudit = {
      id: `key-audit-${Date.now()}`,
      action: 'Key regenerated via profile',
      actor: user?.email,
      created_at: new Date().toISOString()
    }

    const updatedLogs = [newAudit, ...auditLogs.filter(l => l.action !== 'Key regenerated via profile')]

    try {
      await profileService.updateAuthMetadata({
        api_key: newKey,
        api_key_audit_logs: updatedLogs
      })

      setApiKey(newKey)
      setAuditLogs(updatedLogs)
      localStorage.setItem(API_KEY_STORAGE, newKey)
      saveAuditLogs(updatedLogs)
      await alertService.success('API key regenerated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update API key.')
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

  const fullName = `${firstName} ${lastName}`.trim() || 'No name set'
  const accountStatus = resolveAccountStatus({
    ...profile,
    registration_status: registrationStatus,
    employment_status: employmentStatus,
  })

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Profile Settings"
          actions={isAdmin ? [<Button key="save" onClick={handleSaveDetails}>Save Changes</Button>] : []}
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
              Change
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
            <h2>{fullName}</h2>
            <p>{department || 'No department set'}</p>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              Username: {profile?.username || 'Not set'}
            </p>
            {!isAdmin && (<p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              Username is managed by the administrator.
            </p>)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <StatusBadge status={accountStatus} />
            </div>
          </div>
          <div className="profile-identity-actions">
            <Button size="sm" variant="danger" onClick={handleRemoveAvatar}>Remove Picture</Button>
          </div>
        </section>

        <section className="profile-section">
          <h3>Account Details</h3>
          {!isAdmin && (
            <p style={{ color: '#64748b', marginBottom: 16 }}>
              Legal identity information is managed by HR.
            </p>
          )}

          <div className="profile-form-grid">
            <ProfileField label="Username" help="Username is managed by the administrator.">
              <input type="text" className="border p-2 rounded w-full" value={username} onChange={(event) => setUsername(normalizeUsername(event.target.value))} readOnly={!isAdmin} />
            </ProfileField>

            <ProfileField label="First Name">
              <input type="text" className="border p-2 rounded w-full" value={firstName} onChange={(event) => setFirstName(event.target.value)} readOnly={!isAdmin} />
            </ProfileField>

            <ProfileField label="Last Name">
              <input type="text" className="border p-2 rounded w-full" value={lastName} onChange={(event) => setLastName(event.target.value)} readOnly={!isAdmin} />
            </ProfileField>

            <ProfileField label="Department">
              {isAdmin ? (
                <input className="border p-2 rounded w-full" value={department} onChange={(event) => setDepartment(event.target.value)} readOnly/>

              ) : (
                <input className="border p-2 rounded w-full" value={department} readOnly />
              )}
            </ProfileField>

            <ProfileField label="Position">
              {isAdmin ? (
                <input className="border p-2 rounded w-full" value={position} onChange={(event) => setPosition(event.target.value)} readOnly/>
                  //POSITION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)
                  
              ) : (
                <input className="border p-2 rounded w-full" value={position} readOnly />
              )}
            </ProfileField>
{/*
            <ProfileField label="Account Status">
              {isAdmin ? (
                <select className="border p-2 rounded w-full" value={registrationStatus} onChange={(event) => setRegistrationStatus(event.target.value)}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              ) : (
                <input className="border p-2 rounded w-full" value={registrationStatus} readOnly />
              )}
            </ProfileField>
*/}
            <ProfileField label="Employment Status">
              {isAdmin ? (
                <input className="border p-2 rounded w-full" value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value)} readOnly/>
                  /*<option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="resigned">resigned</option>
                  <option value="terminated">terminated</option>*/
              ) : (
                <input className="border p-2 rounded w-full" value={employmentStatus} readOnly />
              )}
            </ProfileField>
          </div>
        </section>

        <section className="profile-section">
          <h3>Preferences</h3>
          <div style={{ maxWidth: 280 }}>
            <ProfileField label="Theme">
              <select value={theme} onChange={(event) => setTheme(event.target.value)} className="border p-2 rounded w-full">
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </ProfileField>
          </div>
        </section>

        <section className="profile-section">
          <h3>Security</h3>
          <div style={{ maxWidth: 340 }}>
            <ProfileField label="New Password">
              <div style={{ position: 'relative' }}>
                <input type={showNewPassword ? 'text' : 'password'} className="border p-2 rounded w-full" placeholder="Enter new password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={{ paddingRight: '64px' }} />
                <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </ProfileField>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button onClick={handleUpdatePassword}>Change Password</Button>
          </div>
        </section>

        <section className="profile-section profile-danger-zone">
          <h3>Danger Zone</h3>
          <p style={{ color: '#64748b', marginBottom: 16 }}>Irreversible account actions.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <Button variant="danger" onClick={handleLogout}>Log Out</Button>
            <Button variant="danger" onClick={handleLogoutAllDevices}>Logout All Devices</Button>
          </div>
          {isAdmin && (
            <>
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowActiveSessions((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    color: '#b91c1c',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  {showActiveSessions ? 'Hide Active Sessions' : 'Show Active Sessions'}
                </button>
              </div>
              {showActiveSessions && (
                <div style={{ marginTop: 12, width: '100%' }}>
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
                </div>
              )}
            </>
          )}
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
                        {item.document_id || item.id || 'No ID'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {isAdmin && (
          <section className="profile-section" style={{ marginTop: 24 }}>
            <h3>Administrator Settings</h3>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontWeight: 600, marginBottom: 8 }}>API Key</h4>
              <div style={{ maxWidth: 400 }}>
                <input className="border p-2 rounded w-full mb-2" value={apiKey} readOnly style={{ fontFamily: 'monospace', fontSize: 13 }} />
              </div>
              <Button variant="outline" onClick={handleRotateApiKey}>Regenerate Key</Button>
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 8 }}>Key Audit Log (Persistent)</h4>
              <Table columns={auditColumns} data={auditLogs} />
            </div>
          </section>
        )}
      </main>

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
    </DashboardLayout>
  )
}

export default ProfileSettings