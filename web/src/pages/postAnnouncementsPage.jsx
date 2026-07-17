import React, { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import Sidebar from '../components/sideBar'
import { Button, Modal, PageHeader, StatusBadge, Table } from '../components'
import { useAuth } from '../services/authContext'
import { ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_VISIBILITY_SCOPES, announcementService } from '../services/announcementService'
import { emailService } from '../services/emailService'
import { PRIORITY_LEVELS, getNotificationId, notificationService } from '../services/notificationService'
import { usePermissions } from '../contexts/PermissionContext'
import { alertService } from '../utils/alertService'

const PostAnnouncement = () => {
  const { user, profile } = useAuth()
  const { hasPermission, getScope } = usePermissions()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('Published')
  const [priority, setPriority] = useState('Normal')
  const [visibilityScope, setVisibilityScope] = useState('ORGANIZATION')
  const [visibilityTarget, setVisibilityTarget] = useState('')
  const [availableAudiences, setAvailableAudiences] = useState([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const canCreateAnnouncements = hasPermission('ANN_CREATE')
  const announcementScope = getScope('ANN_CREATE') || 'ALL'

  useEffect(() => {
    if (!canCreateAnnouncements || !profile) {
      setAvailableAudiences([{ label: 'Entire Organization', value: 'ORGANIZATION', target: null }])
      return
    }

    const audiences = [{ label: 'Entire Organization', value: 'ORGANIZATION', target: null }]

    const scope = String(announcementScope || 'ALL').toUpperCase()
    const userDepartment = String(profile.department || '').trim()
    const userRoleId = profile.role_id ?? null

    const canAccess = (allowed) => allowed.some((s) => s === scope || s === 'ALL')

    if (canAccess(['ALL', 'DEPARTMENT', 'SUBORDINATE']) && userDepartment) {
      audiences.push({ label: `Department: ${userDepartment}`, value: 'DEPARTMENT', target: userDepartment })
    }

    if (canAccess(['ALL', 'SUBORDINATE']) && userRoleId) {
      audiences.push({ label: 'My Role', value: 'ROLE', target: String(userRoleId) })
    }

    setAvailableAudiences(audiences)
    setVisibilityScope(audiences[0]?.value || 'ORGANIZATION')
    setVisibilityTarget(audiences[0]?.target || '')
  }, [canCreateAnnouncements, profile, announcementScope])

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (canCreateAnnouncements) {
      loadNotifications()
    }
  }, [canCreateAnnouncements])

  const resetForm = () => {
    setTitle('')
    setContent('')
    setStatus('Published')
    setPriority('Normal')
    setVisibilityScope('ORGANIZATION')
    setVisibilityTarget('')
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
        visibilityScope,
        visibilityTarget: visibilityScope === 'ORGANIZATION' ? null : visibilityTarget || null,
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
      alertService.error('Unable to save announcement.', 'Save Failed')
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePriorityChange = async (notificationId, nextPriority) => {
    try {
      await notificationService.updatePriority(notificationId, nextPriority)
      loadNotifications()
    } catch (error) {
      console.error(error.message)
      alertService.error('Unable to update priority.', 'Update Failed')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      await alertService.success('Notification log marked as read.', 'Log Updated')
      loadNotifications()
    } catch (error) {
      console.error(error.message)
      alertService.error('Unable to mark notifications as read.', 'Update Failed')
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
      console.error(error.message)
      alertService.error('Unable to clear old notifications.', 'Clear Failed')
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
          onChange={(event) => handlePriorityChange(getNotificationId(row), event.target.value)}
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

  const previewDate = new Date().toLocaleDateString()

  const renderAnnouncementPreview = () => (
    <div className="announcement-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3>{title || '[Announcement Title]'}</h3>
          <p className="date">
            Published on: {previewDate}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{content || '[Announcement Content]'}</p>
    </div>
  )

  if (!canCreateAnnouncements) {
    return (
      <DashboardLayout>
        <main className="content">
          <PageHeader title="Post Announcement" />
          <p>You do not have permission to create announcements.</p>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <>
      <DashboardLayout>
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

            <label className="block mb-1">Audience</label>
            <select value={visibilityScope} onChange={(event) => {
              const selected = event.target.value
              setVisibilityScope(selected)
              const audience = availableAudiences.find((a) => a.value === selected)
              setVisibilityTarget(audience?.target || '')
            }} className="border p-2 rounded w-full mb-4">
              {availableAudiences.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <label className="block mb-1">Alert Priority</label>
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className="border p-2 rounded w-full mb-4">
              {PRIORITY_LEVELS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <Button onClick={handlePublish} disabled={isPublishing} style={{marginTop:16}}>
              {isPublishing ? 'Saving...' : 'Save Announcement'}
            </Button>
          </section>

          <section className="announcement-output mt-8">
            <div className="preview-heading-row">
              <h3>Preview (Employee View)</h3>
              <span className="live-preview-tag">Live Preview</span>
            </div>
            {renderAnnouncementPreview()}
          </section>

          {canCreateAnnouncements && (
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
          )}
        </main>

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
        {renderAnnouncementPreview()}
      </Modal>
      </DashboardLayout>
    </>
  )
}

export default PostAnnouncement
