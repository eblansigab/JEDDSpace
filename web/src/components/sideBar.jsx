import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../services/authContext'

const Sidebar = () => {
  const [showHRDropdown, setShowHRDropdown] = useState(false)
  const { profile, loading } = useAuth()

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
          <Link to="/dashboard" onClick={closeMobileSidebar}>Dashboard</Link>
        </li>

        <li>
          <Link to="/documents" onClick={closeMobileSidebar}>Documents</Link>
        </li>

        <li>
          <Link to="/emails" onClick={closeMobileSidebar}>Email</Link>
        </li>

        <li>
          <Link to="/contracts" onClick={closeMobileSidebar}>Contracts</Link>
        </li>

        <li>
          <Link to="/announcements" onClick={closeMobileSidebar}>Announcements</Link>
        </li>

        <li>
          <button
            type="button"
            className="drop-btn"
            onClick={() => setShowHRDropdown((isOpen) => !isOpen)}
            aria-expanded={showHRDropdown}
          >
            HR Forms {showHRDropdown ? 'Up' : 'Down'}
          </button>

          {showHRDropdown && (
            <ul className="dropdown">
              <li>
                <Link to="/official-business" onClick={closeMobileSidebar}>Official Business Form</Link>
              </li>
              <li>
                <Link to="/leave-form" onClick={closeMobileSidebar}>Leave Form</Link>
              </li>
            </ul>
          )}
        </li>

        {profile?.role === 'admin' && (
          <li>
            <Link to="/admin-dashboard" onClick={closeMobileSidebar}>Admin Dashboard</Link>
          </li>
        )}

        <li>
          <Link to="/profile" onClick={closeMobileSidebar}>Profile Settings</Link>
        </li>
      </ul>
    </nav>
  )
}

export default Sidebar
