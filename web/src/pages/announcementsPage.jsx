import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, Modal, PageHeader, SearchBar, StatusBadge } from '../components'
import { useEffect, useMemo, useState } from 'react'
import { ANNOUNCEMENT_STATUSES, announcementService } from '../services/announcementService'
import { alertService } from '../utils/alertService'

const AnnouncementsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editStatus, setEditStatus] = useState('Published')
  const [isSaving, setIsSaving] = useState(false)

  const loadAnnouncements = async () => {
    setLoading(true)

    try {
      const data = await announcementService.getAnnouncements()
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
  }, [])

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
      await announcementService.updateAnnouncement(
        editingAnnouncement.announcement_id || editingAnnouncement.id,
        {
          title: editTitle,
          body: editBody,
          status: editStatus
        }
      )

      await alertService.success('Announcement updated successfully.', 'Announcement Updated')
      closeEditModal()
      loadAnnouncements()
    } catch (error) {
      alertService.error(error.message || 'Unable to update announcement.', 'Update Failed')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredAnnouncements = useMemo(
    () => {
      const query = searchTerm.trim().toLowerCase()

      return announcements.filter((item) =>
        [item.title, item.body, item.status].some((text) =>
          text?.toLowerCase().includes(query)
        )
      )
    },
    [announcements, searchTerm]
  )

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader
            title="Announcements"
            subtitle="Company announcement history and active post management."
            actions={[
              <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search announcements..." />,
              <Button key="clear" variant="outline" onClick={() => setSearchTerm('')}>
                Clear
              </Button>
            ]}
          />

          {loading && <p>Loading announcements...</p>}

          {!loading && filteredAnnouncements.length === 0 && (
            <p>No announcements found.</p>
          )}

          {!loading && filteredAnnouncements.map((item) => (
            <div key={item.announcement_id || item.id || item.created_at} className="announcement-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h3>{item.title}</h3>
                  <p className="date">
                    Published on: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'No date'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={item.status || 'Published'} />
                  <Button variant="outline" onClick={() => openEditModal(item)}>Edit</Button>
                </div>
              </div>
              <p>{item.body}</p>
            </div>
          ))}
        </main>
      </div>

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
    </div>
  )
}

export default AnnouncementsPage
