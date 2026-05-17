import { useState } from 'react'
import { Link } from 'react-router-dom'

import '../styles/style.css'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const CommonDashboardPage = () => {
  const [showHRDropdown, setShowHRDropdown] = useState(false)

  const toggleDropdown = () => {
    setShowHRDropdown(!showHRDropdown)
  }

  return (
    <div className="dashboard-page">

      {/* Top Bar */}
      <header>
        <Link to="/dashboard">
          <img
            className="max-w-3xs"
            src={logo}
            alt="JEDDSpace - by JEDDTech Corp."
            style={{ width: '220px' }}
          />
        </Link>
      </header>

      <div className="layout">

        {/* Sidebar */}
        <nav className="sidebar">
          <ul>

            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>

            <li>
              <Link to="/documents">Documents</Link>
            </li>

            <li>
              <Link to="/emails">Email</Link>
            </li>

            <li>
              <Link to="/contracts">Contracts</Link>
            </li>

            <li>
              <Link to="/announcements">Announcements</Link>
            </li>

            {/* HR Forms Dropdown */}
            <li>
              <button
                className="drop-btn"
                onClick={toggleDropdown}
              >
                HR Forms ▼
              </button>

              {showHRDropdown && (
                <ul className="dropdown">

                  <li>
                    <Link to="/official-business">
                      Official Business Form
                    </Link>
                  </li>

                  <li>
                    <Link to="/leave-form">
                      Leave Form
                    </Link>
                  </li>

                </ul>
              )}
            </li>

            <li>
              <Link to="/admin-dashboard">
                Admin Dashboard
              </Link>
            </li>

          </ul>
        </nav>

        {/* Dashboard Content */}
        <main className="content">

          <h1>Dashboard</h1>

          {/* Email Summary */}
          <section className="dashboard-widget">

            <h3>Email Summary</h3>

            <p>You currently have _ Emails</p>

            <button className="primary-btn">
              View Emails
            </button>

          </section>

          {/* File Uploads */}
          <section className="dashboard-widget">

            <h3>File Uploads</h3>

            <p>There are _ Files uploaded</p>

            <button className="primary-btn">
              Check Documents
            </button>

          </section>

          {/* Calendar */}
          <section className="dashboard-widget">

            <h3>Calendar</h3>

            <div className="calendar-box">
              <p>[Calendar layout here]</p>
            </div>

          </section>

        </main>

      </div>

    </div>
  )
}

export default CommonDashboardPage