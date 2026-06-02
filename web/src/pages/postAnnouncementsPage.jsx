import React, { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import Sidebar from '../components/sideBar'
import { Button, Modal, PageHeader, StatusBadge, Table } from '../components'
import { useAuth } from '../services/authContext'
import { ANNOUNCEMENT_STATUSES, announcementService } from '../services/announcementService'
import { emailService } from '../services/emailService'
import { PRIORITY_LEVELS, notificationService } from '../services/notificationService'
import { alertService } from '../utils/alertService'

const PostAnnouncement = () => {
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('Published')
  const [priority, setPriority] = useState('Normal')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const resetForm = () => {
    setTitle('')
    setContent('')
    setStatus('Published')
    setPriority('Normal')
  }

  const handlePublish = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle) {
      return alertService.warning('Please enter an announcement title.', 'Missing Title')
    }

    if (!trimmedContent) {
      return alertService.warning('Please enter announcement content.', 'Missing Content')
    }

    setIsPublishing(true)

    try {
      await announcementService.createAnnouncement({
        title: trimmedTitle,
        body: trimmedContent,
        status,
        userId: user?.id
      })

      if (status === 'Published') {
        await Promise.allSettled([
          notificationService.createNotification({
            title: 'New company announcement posted',
            message: trimmedTitle,
            type: 'announcement',
            priority,
            userId: user?.id
          }),
          emailService.createEmailLog({
            subject: `Announcement: ${trimmedTitle}`,
            body: trimmedContent,
            type: 'announcement',
            userId: user?.id
          })
        ])
      }

      await alertService.success('The announcement has been successfully saved.', 'Announcement Saved')
      resetForm()
      setIsPreviewOpen(false)
      loadNotifications()
    } catch (error) {
      console.error(error)
      alertService.error(error.message || 'Unable to save announcement.', 'Save Failed')
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePriorityChange = async (notificationId, nextPriority) => {
    try {
      await notificationService.updatePriority(notificationId, nextPriority)
      loadNotifications()
    } catch (error) {
      alertService.error(error.message || 'Unable to update priority.', 'Update Failed')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      await alertService.success('Notification log marked as read.', 'Log Updated')
      loadNotifications()
    } catch (error) {
      alertService.error(error.message || 'Unable to mark notifications as read.', 'Update Failed')
    }
  }

  const handleClearOldLogs = async () => {
    const confirmation = await alertService.confirm({
      title: 'Clear old logs?',
      text: 'Notifications older than 30 days will be deleted.',
      confirmButtonText: 'Clear Logs'
    })

    if (!confirmation.isConfirmed) return

    try {
      await notificationService.deleteOlderThan(30)
      await alertService.success('Old notification logs were cleared.', 'Logs Cleared')
      loadNotifications()
    } catch (error) {
      alertService.error(error.message || 'Unable to clear old notifications.', 'Clear Failed')
    }
  }

  const notificationColumns = [
    { key: 'title', title: 'Alert' },
    { key: 'type', title: 'Type' },
    {
      key: 'priority',
      title: 'Priority',
      render: (value, row) => (
        <select
          value={value || 'Normal'}
          onChange={(event) => handlePriorityChange(row.notification_id || row.id, event.target.value)}
        >
          {PRIORITY_LEVELS.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      )
    },
    {
      key: 'is_read',
      title: 'Read',
      render: (value) => <StatusBadge status={value ? 'Completed' : 'Pending'} />
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'No date')
    }
  ]

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader
            title="Post Announcement"
            actions={[
              <Button key="preview" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                Preview
              </Button>,
              <Button key="publish" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Saving...' : 'Save'}
              </Button>
            ]}
          />

          <section className="announcement-management">
            <h3>Create Announcement</h3>

            <label className="block mb-1">Title</label>
            <input
              type="text"
              className="border p-2 rounded w-full mb-4"
              placeholder="Enter announcement title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />

            <label className="block mb-1">Content</label>
            <textarea
              rows="8"
              className="border p-2 rounded w-full mb-4"
              placeholder="Write your announcement here..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />

            <label className="block mb-1">Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="border p-2 rounded w-full mb-4">
              {ANNOUNCEMENT_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <label className="block mb-1">Alert Priority</label>
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className="border p-2 rounded w-full mb-4">
              {PRIORITY_LEVELS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? 'Saving...' : 'Save Announcement'}
            </Button>
          </section>

          <section className="announcement-output mt-8">
            <h3>Preview (Employee View)</h3>
            <div className="announcement-box p-4 border rounded bg-white shadow-sm">
              <h4 className="font-bold text-lg">{title || '[Announcement Title]'}</h4>
              <p className="date text-sm text-gray-500 mb-2">
                <StatusBadge status={status} />
              </p>
              <p className="date text-sm text-gray-500 mb-3">
                Published on: {new Date().toLocaleDateString()}
              </p>
              <p className="whitespace-pre-wrap">{content || '[Announcement Content]'}</p>
            </div>
          </section>

          <section className="profile-section">
            <PageHeader
              title="Alert Management"
              subtitle="Notification records created for announcements and future mobile alerts."
              actions={[
                <Button key="read" variant="outline" onClick={handleMarkAllRead}>Mark All Read</Button>,
                <Button key="clear" variant="danger" onClick={handleClearOldLogs}>Clear Old Logs</Button>
              ]}
            />
            <Table columns={notificationColumns} data={notifications} />
          </section>
        </main>
      </div>

      <Modal
        visible={isPreviewOpen}
        title="Announcement Preview"
        onClose={() => setIsPreviewOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            <Button onClick={handlePublish} disabled={isPublishing}>{isPublishing ? 'Saving...' : 'Save Announcement'}</Button>
          </div>
        }
      >
        <div className="announcement-box">
          <h3>{title || '[Announcement Title]'}</h3>
          <p className="date">Status: {status}</p>
          <p>{content || '[Announcement Content]'}</p>
        </div>
      </Modal>
    </div>
  )
}

export default PostAnnouncement
