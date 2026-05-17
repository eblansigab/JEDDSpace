import { useState } from 'react'
import { Link } from 'react-router-dom'

import '../styles/style.css'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const AdminDashboardPage = () => {

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

        {/* Main Content */}
        <main className="content">

          <h2>Admin Dashboard</h2>

          <div className="admin-grid">

            {/* Post Announcement */}
            <div className="admin-box">

              <h3>Post Announcement</h3>

              <p>
                Create and publish new announcements for employees.
              </p>

              <Link
                to="/post-announcements"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

            {/* Manage Employees */}
            <div className="admin-box">

              <h3>Manage Employees</h3>

              <p>
                View, edit, and manage employee records.
              </p>

              <Link
                to="/manage-employees"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

            {/* Assign Jobs */}
            <div className="admin-box">

              <h3>Assign Travelling Jobs</h3>

              <p>
                Assign and track employee travel jobs.
              </p>

              <Link
                to="/assign-jobs"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

            {/* Audit Blockchain */}
            <div className="admin-box">

              <h3>Audit Blockchain Records</h3>

              <p>
                Review and audit blockchain transaction logs.
              </p>

              <Link
                to="/audit-blockchain"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

          </div>

        </main>

      </div>

    </div>
  )
}

export default AdminDashboardPage