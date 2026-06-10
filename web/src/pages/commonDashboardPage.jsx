import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button } from '../components'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { emailService } from '../services/emailService'
import { alertService } from '../utils/alertService'

const CommonDashboardPage = () => {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [emailCount, setEmailCount] = useState(0)
  const [fileCount, setFileCount] = useState(0)
  const [latestEmail, setLatestEmail] = useState('')
  const [latestFile, setLatestFile] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [collapsedWidgets, setCollapsedWidgets] = useState({
    email: false,
    files: false,
    calendar: false
  })

  const toggleWidget = (widget) => {
    setCollapsedWidgets((current) => ({
      ...current,
      [widget]: !current[widget]
    }))
  }

  const loadDashboardSummary = async () => {
    const [emails, documents] = await Promise.all([
      emailService.getEmailLogs(),
      documentService.getAllDocuments()
    ])

    setEmailCount(emails.length)
    setFileCount(documents.length)
    setLatestEmail(emails[0]?.subject || emails[0]?.title || '')
    setLatestFile(documents[0]?.title || documents[0]?.file_name || documents[0]?.name || '')
  }

  useEffect(() => {
    loadDashboardSummary()
  }, [])

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      await documentService.recordUpload(file, user?.id)
      await alertService.success(`${file.name} has been added to your document uploads.`, 'File Uploaded')
      await loadDashboardSummary()
    } catch (error) {
      await alertService.error(error.message || 'Unable to upload file.', 'Upload Failed')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <DashboardLayout>
        <main className="content">
            <div>
              <h3>Dashboard</h3>
              <p>Quick access to your email logs, uploaded files, and today&apos;s schedule.</p>
            </div>

          <div className="dashboard-grid">
            <section className={`dashboard-widget ${collapsedWidgets.email ? 'is-collapsed' : ''}`}>
              <div className="dashboard-widget-header">
                <div>
                  <h3>Email Summary</h3>
                  <span>{emailCount} logged {emailCount === 1 ? 'email' : 'emails'}</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleWidget('email')}>
                  {collapsedWidgets.email ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedWidgets.email && (
                <div className="dashboard-widget-body">
                  <p>You currently have {emailCount} logged {emailCount === 1 ? 'email' : 'emails'}.</p>
                  {latestEmail && <p className="date">Latest: {latestEmail}</p>}
                  <Link to="/emails" className="primary-btn">
                    View Emails
                  </Link>
                </div>
              )}
            </section>

            <section className={`dashboard-widget ${collapsedWidgets.files ? 'is-collapsed' : ''}`}>
              <div className="dashboard-widget-header">
                <div>
                  <h3>File Uploads</h3>
                  <span>{fileCount} uploaded {fileCount === 1 ? 'file' : 'files'}</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleWidget('files')}>
                  {collapsedWidgets.files ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedWidgets.files && (
                <div className="dashboard-widget-body">
                  <p>There are {fileCount} {fileCount === 1 ? 'file' : 'files'} uploaded.</p>
                  {latestFile && <p className="date">Latest: {latestFile}</p>}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload File'}
                    </Button>
                    <Link to="/documents" className="primary-btn">
                      Check Documents
                    </Link>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
            </section>

            <section className={`dashboard-widget ${collapsedWidgets.calendar ? 'is-collapsed' : ''} calendar-widget`}>
              <div className="dashboard-widget-header">
                <div>
                  <h3>Calendar</h3>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <button type="button" className="collapse-btn" onClick={() => toggleWidget('calendar')}>
                  {collapsedWidgets.calendar ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedWidgets.calendar && (
                <div className="dashboard-widget-body">
                  <div className="calendar-box">
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </section>
          </div>
                </main>
    </DashboardLayout>
  )
}

export default CommonDashboardPage
