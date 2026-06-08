import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../services/authContext'
import { supabaseClient } from '../supabase/supabaseClient'

const Sidebar = () => {
  const [showHRDropdown, setShowHRDropdown] = useState(false)
  const { profile, loading, user } = useAuth()
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
      } catch (err) {
        // silent
      }
    }

    ensureRole()

    return () => { mounted = false }
  }, [profile, user])

  const isAdmin = role === 'admin'

  const closeMobileSidebar = () => {
    document.body.classList.remove('mobile-sidebar-open')
  }

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
        >
          x
        </button>
      </div>

      <ul>
        <li>
          <Link to="/dashboard" onClick={closeMobileSidebar} title="Dashboard">
            <span className="sidebar-link-text">Dashboard</span>
          </Link>
        </li>

        <li>
          <Link to="/documents" onClick={closeMobileSidebar} title="Documents">
            <span className="sidebar-link-text">Documents</span>
          </Link>
        </li>

        <li>
          <Link to="/emails" onClick={closeMobileSidebar} title="Emails">
            <span className="sidebar-link-text">Email</span>
          </Link>
        </li>

        <li>
          <Link to="/contracts" onClick={closeMobileSidebar} title="Contracts">
            <span className="sidebar-link-text">Contracts</span>
          </Link>
        </li>

        <li>
          <Link to="/announcements" onClick={closeMobileSidebar} title="Announcements">
            <span className="sidebar-link-text">Announcements</span>
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
            <span className="sidebar-link-text">HR Forms</span>
            <span className="sidebar-link-indicator">{showHRDropdown ? '▲' : '▼'}</span>
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
              <span className="sidebar-link-text">Admin Dashboard</span>
            </Link>
          </li>
        )}

        <li>
          <Link to="/profile" onClick={closeMobileSidebar} title="Profile Settings">
            <span className="sidebar-link-text">Profile Settings</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar
