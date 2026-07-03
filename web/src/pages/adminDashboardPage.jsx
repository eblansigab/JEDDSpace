import { Link } from 'react-router-dom'
import '../styles/style.css'
import DashboardLayout from '../layouts/dashboardLayout'

const AdminDashboardPage = () => {
  return (
    <DashboardLayout>
        <main className="content">

          <div className="page-intro">
            <h1>Admin Dashboard</h1>
            <p>Administrative access to edit employee information and notifications, and verify the blockchain behind every file upload.</p>
          </div>

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

            {/* Registration Requests */}
            <div className="admin-box">

              <h3>Registration Requests</h3>

              <p>
                Approve or reject new account registrations.
              </p>

              <Link
                to="/registration-requests"
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

            {/* AI Analytics */}
            <div className="admin-box">

              <h3>AI Analytics</h3>

              <p>
                View AI usage patterns and insights.
              </p>

              <Link
                to="/ai-analytics"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

            {/* AI History */}
            <div className="admin-box">

              <h3>AI Chat History</h3>

              <p>
                View all AI conversation logs across the system.
              </p>

              <Link
                to="/ai-chat-logs"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

            {/* Forms Outlet */}
            <div className="admin-box">

              <h3>Manage Forms</h3>

              <p>
                Leave forms and official business submissions.
              </p>

              <Link
                to="/forms-outlet"
                className="primary-btn"
              >
                Go
              </Link>

            </div>

          </div>

        </main>
    </DashboardLayout>
  )
}

export default AdminDashboardPage
