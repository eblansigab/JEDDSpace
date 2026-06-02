import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, StatusBadge, Table } from '../components'
import { logoutUser, updateUserPassword } from '../services/authService'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { employeeService } from '../services/employeeService'
import { alertService } from '../utils/alertService'

const THEME_KEY = 'jeddspace_theme'
const API_KEY_STORAGE = 'jeddspace_admin_api_key'

const generateApiKey = () => {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase()
  const suffix = Date.now().toString(36).toUpperCase()
  return `JEDD_${token}_${suffix}`
}

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}

const ProfileSettings = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [role, setRole] = useState('')
  const [accountStatus, setAccountStatus] = useState('Active')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light')
  const [apiKey, setApiKey] = useState(localStorage.getItem(API_KEY_STORAGE) || generateApiKey())

  useEffect(() => {
    if (!localStorage.getItem(API_KEY_STORAGE)) {
      localStorage.setItem(API_KEY_STORAGE, apiKey)
    }
  }, [apiKey])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!profile) return

    setFirstName(profile.first_name || '')
    setLastName(profile.last_name || '')
    setDepartment(profile.department || '')
    setPosition(profile.position || '')
    setRole(profile.role || '')
    setAccountStatus(profile.employment_status || profile.status || 'Active')
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
      await employeeService.updateByUserId(user.id, {
        first_name: firstName,
        last_name: lastName,
        department
      })

      await alertService.success('Account details updated successfully.')
    } catch (error) {
      await alertService.error(error.message || 'Failed to update account details.')
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
    localStorage.setItem(API_KEY_STORAGE, nextKey)
    setApiKey(nextKey)
    await alertService.success('A new display API key has been generated.', 'Secret Key Rotated')
  }

  const uploadColumns = [
    { key: 'document_id', title: 'File ID', render: (value, row) => value || row.id || 'N/A' },
    { key: 'title', title: 'File Name', render: (value, row) => value || row.file_name || row.name || 'Untitled document' },
    {
      key: 'created_at',
      title: 'Upload Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'No date')
    }
  ]

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader
            title="Profile Settings"
            actions={[<Button key="save" onClick={handleSaveDetails}>Save Changes</Button>]}
          />

          <section className="profile-section">
            <h3>Identity Information</h3>
            <p><strong>Name:</strong> {`${firstName} ${lastName}`.trim() || 'No name set'}</p>
            <p><strong>Email:</strong> {user?.email || 'No email set'}</p>
            <p><strong>Department:</strong> {department || 'No department set'}</p>
            <p><strong>Position:</strong> {position || 'No position set'}</p>
            <p><strong>Role:</strong> {role || 'No role set'}</p>
            <p><strong>Account Status:</strong> <StatusBadge status={accountStatus} /></p>
          </section>

          <section className="profile-section">
            <h3>Account Details</h3>
            <label>First Name</label>
            <input className="border p-2 rounded w-full mb-4" value={firstName} onChange={(event) => setFirstName(event.target.value)} />

            <label>Last Name</label>
            <input className="border p-2 rounded w-full mb-4" value={lastName} onChange={(event) => setLastName(event.target.value)} />

            <label>Department</label>
            <input className="border p-2 rounded w-full mb-4" value={department} onChange={(event) => setDepartment(event.target.value)} />

            <Button onClick={handleSaveDetails}>Update Account Details</Button>
          </section>

          <section className="profile-section">
            <h3>Change Password</h3>
            <label>Current Password</label>
            <div style={{ position: 'relative' }} className="mb-4">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                className="border p-2 rounded w-full"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                {showCurrentPassword ? 'Hide' : 'Show'}
              </button>
            </div>

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

            <Button onClick={handleUpdatePassword}>Update Password</Button>
          </section>

          <section className="profile-section">
            <h3>Upload History</h3>
            <Table columns={uploadColumns} data={uploadHistory} />
          </section>

          <section className="profile-section">
            <h3>System Theme</h3>
            <label>Theme</label>
            <select value={theme} onChange={(event) => setTheme(event.target.value)} className="border p-2 rounded w-full mb-4">
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
            </select>
          </section>

          <section className="profile-section">
            <h3>Security Settings</h3>

            <label>Display API Key</label>
            <input className="border p-2 rounded w-full mb-4" value={apiKey} readOnly />
            <Button variant="outline" onClick={handleRotateApiKey}>Regenerate Key</Button>

            <div style={{ marginTop: 24 }}>
              <h4>Session Tokens</h4>
              <p className="mb-4">Current session: {user?.email || 'No active session'}</p>
              <Button variant="danger" onClick={handleLogout}>Logout Other Sessions</Button>
            </div>
          </section>

          <section className="profile-section">
            <h3>Two-Factor Authentication</h3>
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
          </section>

          <section className="profile-section">
            <h3>Account Actions</h3>
            <p className="mb-4">Log out of your JEDDSpace account.</p>
            <Button variant="danger" onClick={handleLogout}>Log Out</Button>
          </section>
        </main>
      </div>
    </div>
  )
}

export default ProfileSettings
