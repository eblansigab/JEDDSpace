import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button } from '../components'
import Modal from '../components/Modal'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { emailService } from '../services/emailService'
import { sessionService } from '../services/sessionService'
import { alertService } from '../utils/alertService'
import { announcementService } from '../services/announcementService'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabaseClient } from '../supabase/supabaseClient'

const CommonDashboardPage = () => {
  const { user, profile } = useAuth()
  const fileInputRef = useRef(null)
  const [emailCount, setEmailCount] = useState(0)
  const [fileCount, setFileCount] = useState(0)
  const [latestEmail, setLatestEmail] = useState('')
  const [latestFile, setLatestFile] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [collapsedWidgets, setCollapsedWidgets] = useState({
    overview: false,
    email: false,
    files: false,
    calendar: false
  })
  const [unreadEmails, setUnreadEmails] = useState([])
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [isLoadingUnread, setIsLoadingUnread] = useState(false)

  const loadUnreadEmails = async () => {
    setIsLoadingUnread(true)
    try {
      const emails = await emailService.getEmailLogs()
      const myEmail = String(user?.email || '').trim().toLowerCase()
      const unread = (emails || []).filter(
        (m) => (m.recipient_email === myEmail || m.recipient_email === 'all') && !m.is_read && m.sender_id !== profile?.employee_id
      )
      setUnreadEmails(unread)
      setIsSummaryOpen(true)
    } catch (err) {
      console.error('Error loading unread emails:', err)
    } finally {
      setIsLoadingUnread(false)
    }
  }

  const loadCalendarEvents = async () => {
    const viewer = profile
      ? {
          isAdmin: false,
          employee: {
            department: profile.department,
            role_id: profile.role_id,
          },
          scope: profile.role?.scope || profile.scope || 'ALL',
        }
      : null

    const { data: announcements } =
      await announcementService.getAnnouncements(viewer)

    const announcementEvents =
      (announcements || []).map(item => ({
        title: `📢 ${item.title}`,
        start: item.created_at
      }))

    const { data: leaves } =
      await supabaseClient
        .from('leaveform')
        .select('*')

    const leaveEvents =
      (leaves || []).map(item => ({
        title: `🏖 Leave`,
        start: item.start_date,
        end: item.end_date
      }))

    const { data: businessTrips } =
      await supabaseClient
        .from('businessform')
        .select('*')

    const businessEvents =
      (businessTrips || []).map(item => ({
        title: `🧳 ${item.location}`,
        start: item.start_duration,
        end: item.end_duration
      }))

    const { data: jobs } =
      await supabaseClient
        .from('job')
        .select('*')

    const jobEvents =
      (jobs || []).map(item => ({
        title: `💼 ${item.destination}`,
        start: item.start_date,
        end: item.end_date
      }))

    const { data: contracts } =
      await supabaseClient
        .from('contracts')
        .select('*')

    const contractEvents =
      (contracts || []).map(item => ({
        title: `📄 ${item.contract_title}`,
        start: item.start_date,
        end: item.end_date
      }))

    setCalendarEvents([
      ...announcementEvents,
      ...leaveEvents,
      ...businessEvents,
      ...jobEvents,
      ...contractEvents
    ])
  }

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
    const init = async () => {
      try {
        await loadDashboardSummary()
        await loadCalendarEvents()
      } catch (err) {
        console.error("Dashboard Init Error:", err)
      }
    }

    init()
  }, [])

  useEffect(() => {
    if (!user) return
    sessionService.updateSessionActivity()
    const interval = setInterval(() => {
      sessionService.updateSessionActivity()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      await documentService.recordUpload(file, user?.id)
      await alertService.success(`${file.name} has been added to your document uploads.`, 'File Uploaded')
      await loadDashboardSummary()
    } catch (error) {
      console.error(error.message)
      await alertService.error('Unable to upload file.', 'Upload Failed')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <DashboardLayout>
      <main className="content">
        <div>
          <h1>Dashboard</h1>
          <p>Quick access to your logs, uploaded files, and today's schedule.</p>
        </div>

        <div className="dashboard-grid">
          <section className={`dashboard-widget ${collapsedWidgets.overview ? 'is-collapsed' : ''}`}>
            <div className="dashboard-widget-header">
              <div>
                <h3>
                  {/* Sparkles icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"></path><path d="M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8L19 3z"></path><path d="M5 14l.9 2.6L8 17.5l-2.1.9L5 21l-.9-2.6L2 17.5l2.1-.9L5 14z"></path></svg>
                  &nbsp; Today's Overview
                </h3>
                <span>Quick stats</span>
              </div>
              <button type="button" className="collapse-btn" onClick={() => toggleWidget('overview')} title={collapsedWidgets.overview ? 'Expand Overview' : 'Collapse Overview'}>
                {collapsedWidgets.overview ? 'Expand' : 'Collapse'}
              </button>
            </div>
             {!collapsedWidgets.overview && (
               <div className="dashboard-widget-body">
                 <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                   <div style={{ fontSize: 14 }}>
                     <p style={{margin:'auto 0'}}><strong>{emailCount}</strong> messages logged</p>
                     <p style={{marginBottom:0}}><strong>{fileCount}</strong> files uploaded</p>
                   </div>
                   <Link to="/ai-assistant" className="primary-btn" style={{ padding: '8px 12px', textDecoration: 'none' }}>
                     Open AI Assistant
                   </Link>
                 </div>
                 </div>
             )}
             </section>
         


           <section className={`dashboard-widget ${collapsedWidgets.email ? 'is-collapsed' : ''}`}>
              <div className="dashboard-widget-header">
                <div>
                  <h3>
                    {/* Envelope icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    &nbsp; Message Center
                  </h3>
                  <span>{emailCount} logged {emailCount === 1 ? 'message' : 'messages'}</span>
                </div>
              <button type="button" className="collapse-btn" onClick={() => toggleWidget('email')} title={collapsedWidgets.email ? 'Expand Message Summary' : 'Collapse Message Summary'}>
                {collapsedWidgets.email ? 'Expand' : 'Collapse'}
              </button>
            </div>
             {!collapsedWidgets.email && (
               <div className="dashboard-widget-body">
                 <p>You currently have {emailCount} logged {emailCount === 1 ? 'message' : 'messages'}.</p>
                 {latestEmail && <p className="date">Latest: {latestEmail}</p>}
                 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                   <Button onClick={loadUnreadEmails} disabled={isLoadingUnread}>
                     {isLoadingUnread ? 'Loading...' : 'Show Unread Messages'}
                   </Button>
                    <Link to="/emails" className="primary-btn">
                       View Messages
                    </Link>
                 </div>
               </div>
             )}
           </section>

          <section className={`dashboard-widget ${collapsedWidgets.files ? 'is-collapsed' : ''}`}>
            <div className="dashboard-widget-header">
              <div>
                <h3>
                  {/* Folder-open icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><polyline points="12 11 12 17"></polyline><polyline points="9 14 12 17 15 14"></polyline></svg>
                  &nbsp; File Uploads
                </h3>
                <span>{fileCount} uploaded {fileCount === 1 ? 'file' : 'files'}</span>
              </div>
              <button type="button" className="collapse-btn" onClick={() => toggleWidget('files')} title={collapsedWidgets.files ? 'Expand File Uploads' : 'Collapse File Uploads'}>
                {collapsedWidgets.files ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsedWidgets.files && (
              <div className="dashboard-widget-body">
                <p>There are {fileCount} {fileCount === 1 ? 'file' : 'files'} uploaded.</p>
                {latestFile && <p className="date">Latest: {latestFile}</p>}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
                </div>
              
              )}
            </section>
          

          <section className={`dashboard-widget ${collapsedWidgets.calendar ? 'is-collapsed' : ''} calendar-widget`}>
            <div className="dashboard-widget-header">
              <div>
                <h3>
                  {/* Calendar Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days-icon lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                  &nbsp; Calendar
                </h3>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <button type="button" className="collapse-btn" onClick={() => toggleWidget('calendar')} title={collapsedWidgets.calendar ? 'Expand Calendar' : 'Collapse Calendar'}>
                {collapsedWidgets.calendar ? 'Expand' : 'Collapse'}
              </button>
            </div>
            {!collapsedWidgets.calendar && (
              <div className="dashboard-widget-body">
                <div className="calendar-box">
                  <FullCalendar
                    plugins={[
                      dayGridPlugin,
                      interactionPlugin
                    ]}
                    initialView="dayGridMonth"
                    events={calendarEvents}
                    height="500px"
                  />
                </div>
              </div>
            )}
          </section>

          <Modal
            visible={isSummaryOpen}
            onClose={() => setIsSummaryOpen(false)}
            title="Unread Messages"
          >
            {unreadEmails.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No unread messages.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {unreadEmails.map((email) => (
                  <li key={email.email_id} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>{email.subject || '(No Subject)'}</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{email.created_at ? new Date(email.created_at).toLocaleDateString() : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Modal>
        </div>
      </main>
    </DashboardLayout>
  
)}
export default CommonDashboardPage