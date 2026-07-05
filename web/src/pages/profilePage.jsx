/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, StatusBadge } from '../components'
import { logoutUser, updateUserPassword } from '../services/authService'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { employeeService } from '../services/employeeService'
import { profileService } from '../services/profileService'
import { alertService } from '../utils/alertService'
import { DEPARTMENT_OPTIONS, POSITION_OPTIONS, ROLE_OPTIONS } from '../constants/formOptions'

const THEME_KEY = 'jeddspace_theme'
const STANDARD_THEME_KEY = 'theme'
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
  localStorage.setItem(STANDARD_THEME_KEY, theme)
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
  const isAdmin = String(profile?.role || '').trim().toLowerCase() === 'admin'

  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [role, setRole] = useState('')
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
    setRole(profile.role || 'employee')
    setRegistrationStatus(profile.registration_status || 'approved')
    setEmploymentStatus(profile.employment_status || 'active')
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
        role,
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
            <p>{position || 'No position set'}</p>
            <p>{department || 'No department set'}</p>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
              Username: {profile?.username || 'Not set'}
            </p>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              Username is managed by the administrator.
            </p>
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
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={username}
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                readOnly={!isAdmin}
              />
            </ProfileField>

            <ProfileField label="First Name">
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                readOnly={!isAdmin}
              />
            </ProfileField>

            <ProfileField label="Last Name">
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                readOnly={!isAdmin}
              />
            </ProfileField>

            <ProfileField label="Department">
              {isAdmin ? (
                <select className="border p-2 rounded w-full" value={department} onChange={(event) => setDepartment(event.target.value)}>
                  {DEPARTMENT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : (
                <input className="border p-2 rounded w-full" value={department} readOnly />
              )}
            </ProfileField>

            <ProfileField label="Position">
              {isAdmin ? (
                <select className="border p-2 rounded w-full" value={position} onChange={(event) => setPosition(event.target.value)}>
                  {POSITION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : (
                <input className="border p-2 rounded w-full" value={position} readOnly />
              )}
            </ProfileField>

            <ProfileField label="Role">
              {isAdmin ? (
                <select className="border p-2 rounded w-full" value={role} onChange={(event) => setRole(event.target.value)}>
                  {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : (
                <input className="border p-2 rounded w-full" value={role} readOnly />
              )}
            </ProfileField>

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

            <ProfileField label="Employment Status">
              {isAdmin ? (
                <select className="border p-2 rounded w-full" value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value)}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="resigned">resigned</option>
                  <option value="terminated">terminated</option>
                </select>
              ) : (
                <input className="border p-2 rounded w-full" value={employmentStatus} readOnly />
              )}
            </ProfileField>
          </div>
        </section>

        <section className="profile-section">
          <h3>Preferences</h3>
          <div className="profile-form-grid">
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
          <div className="profile-form-grid">
            <ProfileField label="New Password">
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
            </ProfileField>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <Button onClick={handleUpdatePassword}>Change Password</Button>
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
                        {item.document_id || item.id || 'No ID'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ProfileSettings
