import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../services/authContext'
import { supabaseClient } from '../supabase/supabaseClient'
import { profileService } from '../services/profileService'
import { emailService } from '../services/emailService'

const Sidebar = () => {
  const [showHRDropdown, setShowHRDropdown] = useState(false)
  const [unreadEmailCount, setUnreadEmailCount] = useState(0)
  const [avatarError, setAvatarError] = useState(false)
  const { profile, loading, user, isEmailVerified } = useAuth()
  const [role, setRole] = useState(String(profile?.role || '').trim().toLowerCase() || '')

  useEffect(() => {
    let mounted = true

    const ensureRole = async () => {
      if (profile?.role) {
        if (mounted) setRole(String(profile.role).trim().toLowerCase())
        return
      }

      if (!user) return

      try {
        const { data, error } = await supabaseClient
          .from('employee')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!error && data && mounted) {
          setRole(String(data.role || '').trim().toLowerCase())
        }
      } catch {
        // silent
      }
    }

    const loadUnreadCount = async () => {
      if (!profile?.email && !user?.email) return

      try {
        const count = await emailService.getUnreadCount({
          email: profile?.email || user?.email,
          employeeId: profile?.employee_id
        })
        if (mounted) setUnreadEmailCount(count)
      } catch (err) {
        console.error('[Sidebar] Error loading unread email count:', err)
      }
    }

    ensureRole()
    loadUnreadCount()

    return () => { mounted = false }
  }, [profile, user])

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    try {
      await profileService.updateAuthMetadata({
        presence_status: newStatus
      })
    } catch (err) {
      console.error('Failed to update presence status:', err.message)
    }
  }

  const getInitials = (first, last) => profileService.getInitials(first, last)

  const getStatusClass = () => {
    const status = String(user?.user_metadata?.presence_status || 'Available').toLowerCase()
    if (status === 'busy') return 'status-busy'
    if (status === 'do not disturb' || status === 'dnd') return 'status-dnd'
    if (status === 'away') return 'status-away'
    return 'status-available'
  }

  const isAdmin = role === 'admin'

  const closeMobileSidebar = () => {
    document.body.classList.remove('mobile-sidebar-open')
  }

  const isMobileOpen = () => document.body.classList.contains('mobile-sidebar-open')

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isMobileOpen()) {
        closeMobileSidebar()
      }
    }

    const handleClickOutside = (event) => {
      if (!isMobileOpen()) return
      const sidebar = document.querySelector('.sidebar')
      const toggleButton = document.querySelector('.mobile-menu-toggle')
      if (
        sidebar &&
        !sidebar.contains(event.target) &&
        toggleButton &&
        !toggleButton.contains(event.target)
      ) {
        closeMobileSidebar()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  if (loading) {
    return null
  }

  return (
    <nav className="sidebar">
      <div className="mobile-sidebar-header">
        <span>Menu</span>
        <button
          type="button"
          className="mobile-close-btn"
          onClick={closeMobileSidebar}
          aria-label="Close menu"
          title="Close menu"
        >
          x
        </button>
      </div>

      {profile && (
        <div className="sidebar-profile-card">
          <div className="sidebar-profile-header-row">
            <div className="sidebar-avatar-wrapper">
              {!avatarError && profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile avatar"
                  className="sidebar-avatar-img"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="sidebar-avatar">{getInitials(profile?.first_name, profile?.last_name)}</div>
              )}
              <span className={`sidebar-status-badge ${getStatusClass()}`} />
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{`${profile.first_name} ${profile.last_name}`}</span>
              {user?.user_metadata?.custom_status && (
                <span className="sidebar-custom-status" title={user.user_metadata.custom_status}>
                  {user.user_metadata.custom_status}
                </span>
              )}
            </div>
          </div>
          <select
            className="sidebar-status-select"
            value={user?.user_metadata?.presence_status || 'Available'}
            onChange={handleStatusChange}
          >
            <option value="Available">🟢 Available</option>
            <option value="Busy">🟠 Busy</option>
            <option value="Do Not Disturb">🔴 Do Not Disturb</option>
            <option value="Away">⚫ Away</option>
          </select>
        </div>
      )}

      {profile && !isEmailVerified && (
        <div style={{
          padding: '10px',
          marginBottom: '12px',
          borderRadius: '8px',
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          color: '#9a3412',
          fontSize: '13px'
        }}>
          <p style={{ marginBottom: '6px' }}>Your account email is not verified yet.</p>
          <Link to="/profile" onClick={closeMobileSidebar}>
            Verify Account Email
          </Link>
        </div>
      )}


      <ul>
        <li>
          <Link to="/dashboard" onClick={closeMobileSidebar} title="Dashboard">
            {/* Grid/Dashboard icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
            <span className="sidebar-link-text">Dashboard</span>
          </Link>
        </li>

        <li>
          <Link to="/documents" onClick={closeMobileSidebar} title="Documents">
            {/* Folder-open icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><polyline points="12 11 12 17"></polyline><polyline points="9 14 12 17 15 14"></polyline></svg>
            <span className="sidebar-link-text">Documents</span>
          </Link>
        </li>

        <li>
          <Link to="/emails" onClick={closeMobileSidebar} title="Messages">
            {/* Envelope icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span className="sidebar-link-text">Messages</span>
            {unreadEmailCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  lineHeight: 1
                }}
              >
                {unreadEmailCount}
              </span>
            )}
          </Link>
        </li>

        <li>
          <Link to="/contracts" onClick={closeMobileSidebar} title="Contracts">
            {/* Document with checkmark icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="9 15 11 17 15 13"></polyline></svg>
            <span className="sidebar-link-text">Contracts</span>
          </Link>
        </li>

        <li>
          <Link to="/announcements" onClick={closeMobileSidebar} title="Announcements">
            {/* Megaphone icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"></path></svg>
            <span className="sidebar-link-text">Announcements</span>
          </Link>
        </li>

        <li>
          <Link to="/ai-assistant" onClick={closeMobileSidebar} title="AI Assistant">
            {/* Sparkles icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"></path><path d="M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8L19 3z"></path><path d="M5 14l.9 2.6L8 17.5l-2.1.9L5 21l-.9-2.6L2 17.5l2.1-.9L5 14z"></path></svg>
            <span className="sidebar-link-text">AI Assistant</span>
          </Link>
        </li>

        <li>
          <button
            type="button"
            className="drop-btn"
            onClick={() => setShowHRDropdown((isOpen) => !isOpen)}
            aria-expanded={showHRDropdown}
            title="HR Forms"
          >
            {/* Clipboard icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="9" y1="12" x2="15" y2="12"></line><line x1="9" y1="16" x2="13" y2="16"></line></svg>
            <span className="sidebar-link-text">HR Forms</span>
            <span className="sidebar-link-indicator" style={{ marginLeft: 'auto' }}>{showHRDropdown ? '▲' : '▼'}</span>
          </button>

          {showHRDropdown && (
            <ul className="dropdown">
              <li>
                <Link to="/official-business" onClick={closeMobileSidebar} title="Official Business Form">
                  <span className="sidebar-link-text">Official Business Form</span>
                </Link>
              </li>
              <li>
                <Link to="/leave-form" onClick={closeMobileSidebar} title="Leave Form">
                  <span className="sidebar-link-text">Leave Form</span>
                </Link>
              </li>
            </ul>
          )}
        </li>

        {isAdmin && (
          <li>
            <Link to="/admin-dashboard" onClick={closeMobileSidebar} title="Admin Dashboard">
              {/* Shield icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span className="sidebar-link-text">Admin Dashboard</span>
            </Link>
          </li>
        )}

        <li>
          <Link to="/profile" onClick={closeMobileSidebar} title="Profile Settings">
            {/* Gear/settings icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span className="sidebar-link-text">Profile Settings</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar

