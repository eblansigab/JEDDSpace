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

export const ANNOUNCEMENT_REACTION_TYPES = [
  { value: 'acknowledged', label: 'Acknowledged', icon: '👍' },
  { value: 'appreciated', label: 'Appreciated', icon: '❤️' },
  { value: 'important', label: 'Important', icon: '⭐' },
  { value: 'confirmed', label: 'Confirmed', icon: '✅' },
  { value: 'question', label: 'Question', icon: '❓' },
]

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
  const [reactionSummaries, setReactionSummaries] = useState({})
  const [userReactions, setUserReactions] = useState({})
  const [reactionLoading, setReactionLoading] = useState({})
  const [announcementImages, setAnnouncementImages] = useState({})
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [commentImage, setCommentImage] = useState({})
  const [commentReactionSummaries, setCommentReactionSummaries] = useState({})
  const [commentUserReactions, setCommentUserReactions] = useState({})
  const [commentReactionLoading, setCommentReactionLoading] = useState({})
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
      alertService.error('Unable to load announcements.', 'Load Failed')
    } finally {
      setLoading(false)
    }
  }

  const loadReactions = async (announcementIds) => {
    const ids = Array.isArray(announcementIds) ? announcementIds : [announcementIds]
    const summaries = {}
    const reactions = {}

    await Promise.allSettled(
      ids.map(async (id) => {
        try {
          const [summary, list] = await Promise.all([
            announcementService.getReactionSummary(id),
            announcementService.getReactions(id),
          ])
          summaries[id] = summary
          if (profile?.employee_id && list.length > 0) {
            const mine = list.find((r) => r.employee_id === profile.employee_id)
            if (mine) {
              reactions[id] = mine.reaction_type
            }
          }
        } catch {
          summaries[id] = {}
        }
      })
    )

    setReactionSummaries((prev) => ({ ...prev, ...summaries }))
    setUserReactions((prev) => ({ ...prev, ...reactions }))
  }

  const handleReaction = async (announcement, reactionType) => {
    const announcementId = announcement.announcement_id || announcement.id
    if (!profile?.employee_id) return

    setReactionLoading((prev) => ({ ...prev, [announcementId]: true }))
    try {
      await announcementService.addReaction(announcementId, profile.employee_id, reactionType)
      setUserReactions((prev) => ({ ...prev, [announcementId]: reactionType }))
      await loadReactions(announcementId)
    } catch (error) {
      console.log(error.message)
      await alertService.error('Unable to update reaction.', 'Reaction Failed')
    } finally {
      setReactionLoading((prev) => ({ ...prev, [announcementId]: false }))
    }
  }

  const loadAnnouncementImages = async (announcementId) => {
    try {
      const images = await announcementService.getAnnouncementImages(announcementId)
      setAnnouncementImages((prev) => ({ ...prev, [announcementId]: images }))
    } catch (error) {
      console.error('[AnnouncementsPage] Error loading images:', error)
      setAnnouncementImages((prev) => ({ ...prev, [announcementId]: [] }))
    }
  }

  const loadComments = async (announcementId) => {
    try {
      const data = await announcementService.getComments(announcementId)
      setComments((prev) => ({ ...prev, [announcementId]: data }))
    } catch (error) {
      console.error('[AnnouncementsPage] Error loading comments:', error)
      setComments((prev) => ({ ...prev, [announcementId]: [] }))
    }
  }

  const loadCommentReactions = async (commentId) => {
    try {
      const [summary, list] = await Promise.all([
        announcementService.getCommentReactionSummary(commentId),
        announcementService.getCommentReactions(commentId),
      ])
      setCommentReactionSummaries((prev) => ({ ...prev, [commentId]: summary }))
      if (profile?.employee_id && list.length > 0) {
        const mine = list.find((r) => r.employee_id === profile.employee_id)
        if (mine) {
          setCommentUserReactions((prev) => ({ ...prev, [commentId]: mine.reaction_type }))
        }
      }
    } catch (error) {
      console.error('[AnnouncementsPage] Error loading comment reactions:', error)
    }
  }

  const handleCommentImageChange = (announcementId, file) => {
    setCommentImage((prev) => ({ ...prev, [announcementId]: file }))
  }

  const handleCommentPaste = (announcementId) => (event) => {
    const items = event.clipboardData?.items || []
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
    if (imageItem) {
      event.preventDefault()
      const file = imageItem.getAsFile()
      if (file) {
        handleCommentImageChange(announcementId, file)
      }
    }
  }

  const handleSubmitComment = async (announcementId) => {
    const text = String(commentText[announcementId] || '').trim()
    const file = commentImage[announcementId] || null

    if (!text && !file) {
      await alertService.warning('Please enter a comment or attach an image.')
      return
    }

    try {
      await announcementService.createComment(announcementId, text, file)
      setCommentText((prev) => ({ ...prev, [announcementId]: '' }))
      setCommentImage((prev) => ({ ...prev, [announcementId]: null }))
      await loadComments(announcementId)
    } catch (error) {
      await alertService.error(error.message || 'Unable to post comment.', 'Comment Failed')
    }
  }

  const handleDeleteComment = async (commentId, announcementId) => {
    try {
      await announcementService.deleteComment(commentId)
      setComments((prev) => ({
        ...prev,
        [announcementId]: (prev[announcementId] || []).filter((c) => c.comment_id !== commentId)
      }))
      await alertService.success('Comment deleted.', 'Deleted')
    } catch (error) {
      await alertService.error(error.message || 'Unable to delete comment.', 'Error')
    }
  }

  const handleCommentReaction = async (commentId, reactionType) => {
    if (!profile?.employee_id) return
    setCommentReactionLoading((prev) => ({ ...prev, [commentId]: true }))
    try {
      await announcementService.addCommentReaction(commentId, reactionType)
      setCommentUserReactions((prev) => ({ ...prev, [commentId]: reactionType }))
      await loadCommentReactions(commentId)
    } catch {
      await alertService.error('Unable to update reaction.', 'Reaction Failed')
    } finally {
      setCommentReactionLoading((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [viewer])

  useEffect(() => {
    const ids = announcements.map((item) => item.announcement_id || item.id)
    if (ids.length > 0) {
      loadReactions(ids)
    }
  }, [announcements])

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
      console.error(error.message)
      await alertService.error('Unable to update announcement.', 'Update Failed')
    }
  }

  const openAnnouncement = async (announcement) => {
    if (profile?.employee_id) {
      await announcementService.markViewed(announcement.announcement_id || announcement.id, profile.employee_id)
    }
    const announcementId = announcement.announcement_id || announcement.id
    await loadAnnouncementImages(announcementId)
    await loadComments(announcementId)
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
              {announcementImages[item.announcement_id || item.id]?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: 10 }}>
                  {announcementImages[item.announcement_id || item.id].map((img, idx) => (
                    <img
                      key={idx}
                      src={img.image_url}
                      alt={img.file_name || `Announcement image ${idx + 1}`}
                      style={{ maxWidth: '320px', maxHeight: '320px', borderRadius: '8px', border: '1px solid #e5e7eb', objectFit: 'cover' }}
                    />
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }} onClick={(event) => event.stopPropagation()}>
                {ANNOUNCEMENT_REACTION_TYPES.map((reaction) => {
                  const count = reactionSummaries[item.announcement_id || item.id]?.[reaction.value] || 0
                  const isActive = userReactions[item.announcement_id || item.id] === reaction.value
                  return (
                    <button
                      key={reaction.value}
                      onClick={() => handleReaction(item, reaction.value)}
                      disabled={reactionLoading[item.announcement_id || item.id]}
                      title={reaction.label}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 16,
                        border: isActive ? '1px solid #2563eb' : '1px solid #d1d5db',
                        backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : '#fff',
                        color: isActive ? '#2563eb' : '#374151',
                        cursor: reactionLoading[item.announcement_id || item.id] ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: isActive ? '600' : '500',
                        opacity: reactionLoading[item.announcement_id || item.id] ? 0.7 : 1,
                      }}
                    >
                      {reaction.icon}
                      {count > 0 && <span style={{ marginLeft: 4, fontSize: 12 }}>{count}</span>}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }} onClick={(event) => event.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Comments</h4>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{(comments[item.announcement_id || item.id] || []).length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(comments[item.announcement_id || item.id] || []).map((comment) => (
                    <div key={comment.comment_id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{comment.employee_name}</span>
                          {comment.department && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>· {comment.department}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(comment.created_at).toLocaleString()}</span>
                          {comment.employee_id === profile?.employee_id && (
                            <button
                              onClick={() => handleDeleteComment(comment.comment_id, item.announcement_id || item.id)}
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      {comment.comment_text && (
                        <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.5 }}>{comment.comment_text}</p>
                      )}
                      {comment.image_url && (
                        <div style={{ marginBottom: 8 }}>
                          <img
                            src={comment.image_url}
                            alt="Comment image"
                            style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: 6, border: '1px solid #e5e7eb', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={(event) => event.stopPropagation()}>
                        {ANNOUNCEMENT_REACTION_TYPES.map((reaction) => {
                          const count = commentReactionSummaries[comment.comment_id]?.[reaction.value] || 0
                          const isActive = commentUserReactions[comment.comment_id] === reaction.value
                          return (
                            <button
                              key={reaction.value}
                              onClick={() => handleCommentReaction(comment.comment_id, reaction.value)}
                              disabled={commentReactionLoading[comment.comment_id]}
                              title={reaction.label}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 12,
                                border: isActive ? '1px solid #2563eb' : '1px solid #d1d5db',
                                backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : '#fff',
                                color: isActive ? '#2563eb' : '#374151',
                                cursor: commentReactionLoading[comment.comment_id] ? 'not-allowed' : 'pointer',
                                fontSize: 11,
                                fontWeight: isActive ? '600' : '500',
                                opacity: commentReactionLoading[comment.comment_id] ? 0.7 : 1,
                              }}
                            >
                              {reaction.icon}
                              {count > 0 && <span style={{ marginLeft: 3, fontSize: 11 }}>{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        value={commentText[item.announcement_id || item.id] || ''}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [item.announcement_id || item.id]: e.target.value }))}
                        onPaste={handleCommentPaste(item.announcement_id || item.id)}
                        placeholder="Write a comment... (paste an image with Ctrl+V)"
                        style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }}
                      />
                      <input
                        id={`comment-image-${item.announcement_id || item.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCommentImageChange(item.announcement_id || item.id, e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor={`comment-image-${item.announcement_id || item.id}`}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '13%',
                          transform: 'translateY(-50%)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          backgroundColor: commentImage[item.announcement_id || item.id] ? '#dbeafe' : 'transparent',
                          color: commentImage[item.announcement_id || item.id] ? '#2563eb' : '#94a3b8',
                          cursor: 'pointer',
                          fontSize: '16px',
                          lineHeight: 1
                        }}
                        title="Attach image to comment"
                      >
                        {commentImage[item.announcement_id || item.id] ? '🖼️' : '📷'}
                      </label>
                    </div>
                    <Button size="sm" onClick={() => handleSubmitComment(item.announcement_id || item.id)}>Post</Button>
                  </div>
                  {commentImage[item.announcement_id || item.id] && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc'
                    }}>
                      <img
                        src={URL.createObjectURL(commentImage[item.announcement_id || item.id])}
                        alt="Comment preview"
                        style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <span style={{ fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                        {commentImage[item.announcement_id || item.id]?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCommentImageChange(item.announcement_id || item.id, null)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: '700',
                          padding: '0 2px',
                          lineHeight: 1
                        }}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
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

