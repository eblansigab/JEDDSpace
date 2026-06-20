import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import logo from '../assets/JEDDSpace Logo (Transparent).png'
import NotificationBell from '../components/NotificationBell'
import Sidebar from '../components/sideBar'

const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const collapsed = document.body.classList.contains('sidebar-collapsed')
    setSidebarCollapsed(collapsed)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      document.body.classList.toggle('mobile-sidebar-open')
    } else {
      document.body.classList.toggle('sidebar-collapsed')
      const collapsed = document.body.classList.contains('sidebar-collapsed')
      setSidebarCollapsed(collapsed)
    }
  }

  useEffect(() => {
    if (!isMobile) {
      document.body.classList.remove('mobile-sidebar-open')
    }
  }, [isMobile])

  return (
    <div className="dashboard-page">
      <header>
        <div className="left-header">
          <button
            type="button"
          className="collapse-icon"
          onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12H20" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 6L4 12L10 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 12H4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 6L20 12L14 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        <div className="center-header">
          <Link to="/dashboard" className="header-logo">
            <img className="logo-img" src={logo} alt="JEDDSpace Logo" />
          </Link>
        </div>

        <div className="right-header">
          <NotificationBell />
        </div>
      </header>

      <div className="layout">
        <Sidebar />
        {children}
      </div>

      {sidebarCollapsed && (
        <div
          className="mobile-overlay"
          onClick={toggleSidebar}
        />
      )}
    </div>
  )
}

export default DashboardLayout
