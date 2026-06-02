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
    <div className="dashboard-page">
      <DashboardLayout />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <h1>Dashboard</h1>

          <section className="dashboard-widget">
            <h3>Email Summary</h3>
            <p>You currently have {emailCount} logged {emailCount === 1 ? 'email' : 'emails'}.</p>
            {latestEmail && <p className="date">Latest: {latestEmail}</p>}
            <Link to="/emails" className="primary-btn">
              View Emails
            </Link>
          </section>

          <section className="dashboard-widget">
            <h3>File Uploads</h3>
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

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />
          </section>

          <section className="dashboard-widget">
            <h3>Calendar</h3>
            <div className="calendar-box">
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default CommonDashboardPage
