import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/style.css'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
const AdminDashboardPage = () => {

  return (
    <div className="dashboard-page">

      {/* Top Bar */}
      <DashboardLayout/>

      <div className="layout">

        {/* Sidebar */}
          <Sidebar />


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