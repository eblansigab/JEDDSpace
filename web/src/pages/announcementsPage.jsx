import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, Modal, PageHeader, SearchBar, StatusBadge } from '../components'
import { useEffect, useMemo, useState } from 'react'
import { ANNOUNCEMENT_STATUSES, announcementService } from '../services/announcementService'
import { useAuth } from '../services/authContext'
import { usePermissions } from '../contexts/PermissionContext'
import { emailService } from '../services/emailService'
import { notificationService } from '../services/notificationService'
import { alertService } from '../utils/alertService'

const AnnouncementsPage = () => {
  const { user, profile } = useAuth()
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editStatus, setEditStatus] = useState('Published')
  const [isSaving, setIsSaving] = useState(false)
  const [views, setViews] = useState([])
  const [isViewsOpen, setIsViewsOpen] = useState(false)
  const [loadingViews, setLoadingViews] = useState(false)
  const isAdmin = hasPermission('ANN_MANAGE')

  const viewer = useMemo(() => {
    if (!profile) return null
    return {
      isAdmin,
      employee: {
        department: profile.department,
        role_id: profile.role_id,
      },
      scope: profile.role?.scope || profile.scope || 'ALL',
    }
  }, [profile, isAdmin])

  const loadAnnouncements = async () => {
    setLoading(true)

    try {
      const data = await announcementService.getAnnouncements(viewer)
      setAnnouncements(data)
    } catch (error) {
      console.error(error)
      alertService.error(error.message || 'Unable to load announcements.', 'Load Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [viewer])

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement)
    setEditTitle(announcement.title || '')
    setEditBody(announcement.body || '')
    setEditStatus(announcement.status || 'Published')
  }

  const closeEditModal = () => {
    setEditingAnnouncement(null)
    setEditTitle('')
    setEditBody('')
    setEditStatus('Published')
  }

  const handleSaveEdit = async () => {
    if (!editingAnnouncement) return

    if (!editTitle.trim() || !editBody.trim()) {
      await alertService.warning('Please complete the title and body.', 'Missing Details')
      return
    }

    setIsSaving(true)

    try {
      const previousStatus = editingAnnouncement.status || 'Published'

      await announcementService.updateAnnouncement(
        editingAnnouncement.announcement_id || editingAnnouncement.id,
        {
          title: editTitle,
          body: editBody,
          status: editStatus
        }
      )

      if (previousStatus !== 'Published' && editStatus === 'Published') {
        await Promise.allSettled([
          notificationService.createNotification({
            title: 'New company announcement posted',
            message: editTitle.trim(),
            type: 'announcement',
            priority: 'Normal',
            userId: user?.id
          }),
          emailService.createEmailLog({
            subject: `Announcement: ${editTitle.trim()}`,
            body: editBody.trim(),
            type: 'announcement',
            userId: user?.id
          })
        ])
      }

      closeEditModal()
      setIsSaving(false)
      await alertService.success('Announcement updated successfully.', 'Announcement Updated')
      await loadAnnouncements()
    } catch (error) {
      setIsSaving(false)
      await alertService.error(error.message || 'Unable to update announcement.', 'Update Failed')
    }
  }

  const openAnnouncement = async (announcement) => {
    if (profile?.employee_id) {
      await announcementService.markViewed(announcement.announcement_id || announcement.id, profile.employee_id)
    }
  }

  const openViews = async (announcement) => {
    const announcementId = announcement.announcement_id || announcement.id
    setLoadingViews(true)
    setIsViewsOpen(true)
    try {
      const data = await announcementService.getViews(announcementId)
      setViews(data)
    } catch (error) {
      console.error(error)
      setViews([])
    } finally {
      setLoadingViews(false)
    }
  }

  const filteredAnnouncements = useMemo(
    () => {
      const query = searchTerm.trim().toLowerCase()

      return announcements.filter((item) => {
        const matchesStatus = statusFilter === 'All' || (item.status || 'Published') === statusFilter
        const matchesQuery = [item.title, item.body].some((text) =>
          text?.toLowerCase().includes(query)
        )

        return matchesStatus && (!query || matchesQuery)
      })
    },
    [announcements, searchTerm, statusFilter]
  )

  return (
    <>
      <DashboardLayout>
        <main className="content">
          <PageHeader
            title="Announcements"
            subtitle="Company announcement history and active post management."
            actions={[
              <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search announcements..." />,
              <select
                key="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
              >
                <option value="All">All statuses</option>
                {ANNOUNCEMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>,
              <Button
                key="clear"
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('All')
                }}
              >
                Clear
              </Button>
            ]}
          />

          {loading && <p>Loading announcements...</p>}

          {!loading && filteredAnnouncements.length === 0 && (
            <p>No announcements found.</p>
          )}

          {!loading && filteredAnnouncements.map((item) => (
            <div
              key={item.announcement_id || item.id || item.created_at}
              className="announcement-box"
              onClick={() => openAnnouncement(item)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <h3>{item.title}</h3>
                  <p className="date">
                    Published on: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'No date'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={item.status || 'Published'} />
                  {isAdmin && (
                    <Button variant="outline" onClick={() => openEditModal(item)}>Edit</Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" onClick={() => openViews(item)}>Seen By</Button>
                  )}
                </div>
              </div>
              <p>{item.body}</p>
            </div>
          ))}
        </main>
      <Modal
        visible={Boolean(editingAnnouncement)}
        title="Edit Announcement"
        onClose={closeEditModal}
        loading={isSaving}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>Save Changes</Button>
          </div>
        }
      >
        <label>Title</label>
        <input
          type="text"
          value={editTitle}
          onChange={(event) => setEditTitle(event.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <label>Body</label>
        <textarea
          rows="6"
          value={editBody}
          onChange={(event) => setEditBody(event.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <label>Status</label>
        <select value={editStatus} onChange={(event) => setEditStatus(event.target.value)} className="border p-2 rounded w-full mb-4">
          {ANNOUNCEMENT_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </Modal>
      <Modal
        visible={isViewsOpen}
        title="Seen By"
        onClose={() => setIsViewsOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setIsViewsOpen(false)}>Close</Button>
          </div>
        }
      >
        {loadingViews ? (
          <p>Loading views...</p>
        ) : views.length === 0 ? (
          <p>No views recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {views.map((view) => (
              <div key={view.announcement_view_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{view.employee_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{view.department}</div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {view.viewed_at ? new Date(view.viewed_at).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      </DashboardLayout>
    </>
  )
}

export default AnnouncementsPage

