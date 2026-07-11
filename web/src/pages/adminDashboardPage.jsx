import { Link } from 'react-router-dom'
import '../styles/style.css'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button } from '../components'

const StatCard = ({ title, value, subtitle }) => (
  <div className="analytics-stat-card">
    <div className="analytics-stat-value">{value ?? 0}</div>
    <div className="analytics-stat-title">{title}</div>
    {subtitle && <div className="analytics-stat-subtitle">{subtitle}</div>}
  </div>
)

const AdminDashboardPage = () => {
  return (
    <DashboardLayout>
        <main className="content">

          <div className="page-intro">
            <h1>Admin Dashboard</h1>
            <p>Administrative access to edit employee information and notifications, and verify the blockchain behind every file upload.</p>
          </div>

          <div className='dashboard-grid'>
            <section className='dashboard-widget'>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* Megaphone icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-megaphone-icon lucide-megaphone"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/></svg>
                    &nbsp; Post Announcement
                  </h3>
                  <span>Create and publish new announcements for employees.</span>
                </div>
              </div>
              <div className='dashboard-widget-body'>
                <p>You currently have 0 announcements in your drafts.</p>
                <Button>Show Drafts</Button>
                <Link to="/post-announcements" className="primary-btn">
                  View
                </Link>
              </div>
            </section>
            <section className='dashboard-widget'>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* File text icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                    &nbsp; Assign Projects
                  </h3>
                  <span>Assign and track employee projects.</span>
                </div>
              </div>
              <div className='dashboard-widget-body'>
                <p>There are 0 projects that are pending employee assignment.</p>
                <Button>Show Pending Projects</Button>
                <Link to="/assign-jobs" className="primary-btn">
                  View
                </Link>
              </div>
            </section>
            <section className='dashboard-widget'>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* File stack Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-stack-icon lucide-file-stack"><path d="M11 21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1"/><path d="M16 16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1"/><path d="M21 6a2 2 0 0 0-.586-1.414l-2-2A2 2 0 0 0 17 2h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1z"/></svg>
                    &nbsp; Manage Forms
                  </h3>
                  <span>Leave forms and official business submissions.</span>
                </div>
              </div>
              <div className='dashboard-widget-body'>
                <p>0 Leave Forms pending approval.</p>
                <p>0 Official Business Forms pending approval.</p>
                <Link to="/forms-outlet" className="primary-btn">
                  View
                </Link>
              </div>
            </section>
          </div>
          <section className='dashboard-widget'>
            <div className="dashboard-widget-header" style={{display:'flex', justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h3>
                  {/* Chart Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-no-axes-combined-icon lucide-chart-no-axes-combined"><path d="M12 16v5"/><path d="M16 14.639V21"/><path d="M20 10.656V21"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18.463V21"/><path d="M8 14.656V21"/></svg>
                  &nbsp; AI Analytics
                </h3>
                <span>View AI usage patterns and insights.</span>
              </div>
              <div>
                <Link to="/ai-analytics" className="primary-btn">
                  View
                </Link>
              </div>
            </div>
            <div className='dashboard-widget-body'>
              <section className="analytics-section">
                <div className="analytics-stats-grid">
                  <StatCard title="Today" value='0' subtitle="prompts" />
                  <StatCard title="This Week" value='0' subtitle="prompts" />
                  <StatCard title="This Month" value='0' subtitle="prompts" />
                </div>
              </section>
            </div>
          </section>
          <div className='dashboard-grid'>
            <section className='dashboard-widget'>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* Users Icon*/}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-round-icon lucide-users-round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>
                    &nbsp; Manage Employees
                  </h3>
                  <span>View, edit, and manage employee records.</span>
                </div>
              </div>
              <div className='dashboard-widget-body'>
                <p>There are 0 employee accounts that are pending verification.</p>
                <Button>Show Pending Accounts</Button>
                <Link to="/manage-employees" className="primary-btn">
                  View
                </Link>
              </div>
            </section>
            <section className='dashboard-widget'>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* History Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-history-icon lucide-history"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                    &nbsp; AI Chat History
                  </h3>
                  <span>View all AI conversation logs across the system.</span>
                </div>
              </div>
              <div className='dashboard-widget-body'>
                <p>Latest Conversation: testerb, 07/12/2026</p>
                <Link to="/ai-chat-logs" className="primary-btn">
                  View
                </Link>
              </div>
            </section>
            <section className='dashboard-widget'>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* Bitcoin Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bitcoin-icon lucide-bitcoin"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"/></svg>
                    &nbsp; Audit Blockchain Records
                  </h3>
                  <span>Review and audit blockchain transaction logs.</span>
                </div>
              </div>
              <div className='dashboard-widget-body'>
                <p>Latest Record: salt-and-pepper.png, 07/12/2026</p>
                <Link to="/audit-blockchain" className="primary-btn">
                  View
                </Link>
              </div>
            </section>
          </div>

        </main>
    </DashboardLayout>
  )
}

export default AdminDashboardPage
