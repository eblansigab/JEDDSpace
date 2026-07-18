import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, SearchBar } from '../components'
import { useAuth } from '../services/authContext'
import { emailService } from '../services/emailService'
import { notificationService } from '../services/notificationService'
import { alertService } from '../utils/alertService'
import { supabaseClient } from '../supabase/supabaseClient'
import ComposeMessageModal from '../components/messaging/ComposeMessageModal'
import { getEmployeeDirectory, getThreadMessages, sendMessageWithAttachments, MESSAGE_REACTION_TYPES, addMessageReaction, getMessageReactionSummary, getMessageReactions, markMessageRead, getMessageReadReceipts, getMessageImages, uploadMessageImage, deleteMessageImage } from '../services/messageService'

const EmailsPage = () => {
  const { user, profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [messages, setMessages] = useState([])
  const [directory, setDirectory] = useState([])
  const [activeTab, setActiveTab] = useState('inbox') // 'inbox', 'sent', 'unread'
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [threadMessages, setThreadMessages] = useState([])
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeRecipient, setComposeRecipient] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeReplyTo, setComposeReplyTo] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [reactionSummaries, setReactionSummaries] = useState({})
  const [userReactions, setUserReactions] = useState({})
  const [reactionLoading, setReactionLoading] = useState({})
  const [readReceipts, setReadReceipts] = useState([])
  const [messageImages, setMessageImages] = useState({})

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadThread = async (rootEmailId) => {
    try {
      const thread = await getThreadMessages(rootEmailId)
      setThreadMessages(thread || [])
    } catch (error) {
      console.error('[EmailsPage] Error loading thread:', error)
      setThreadMessages([])
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [emailData, dirData] = await Promise.all([
        emailService.getEmailLogs(),
        getEmployeeDirectory()
      ])
      setMessages(emailData)
      setDirectory(dirData || [])
    } catch (error) {
      console.error('[EmailsPage] Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Realtime channel subscription for instant inbox updates
    const channel = supabaseClient
      .channel('emails-realtime-update')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email'
        },
        () => {
          // Silent refresh of emails when a new message is inserted
          emailService.getEmailLogs().then((emailData) => {
            setMessages(emailData)
          }).catch(err => console.error(err))
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [])

  // Helper to resolve Sender Name from sender_id
  const getSenderName = (senderId) => {
    if (!senderId) return 'System'
    const emp = directory.find((e) => e.employee_id === senderId)
    return emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${senderId}`
  }

  // Helper to resolve Recipient Name from email
  const getRecipientName = (email) => {
    if (!email) return 'All Employees'
    if (email === 'all') return 'All Employees'
    const emp = directory.find((e) => String(e.email || '').trim().toLowerCase() === String(email).trim().toLowerCase())
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Recipient'
  }

  // Filter messages based on active tab and search term
  const filteredMessages = useMemo(() => {
    const myEmail = String(profile?.email || user?.email || '').trim().toLowerCase()
    const myEmployeeId = profile?.employee_id

    const tabMsgs = messages.filter((msg) => {
      const recipientClean = String(msg.recipient_email || msg.recipient || '').trim().toLowerCase()
      const isSentByMe = msg.sender_id === myEmployeeId

      if (activeTab === 'sent') {
        return isSentByMe
      } else if (activeTab === 'unread') {
        return (recipientClean === myEmail || recipientClean === 'all') && !msg.is_read && !isSentByMe
      } else {
        // inbox folder
        return (recipientClean === myEmail || recipientClean === 'all') && !isSentByMe
      }
    })

    if (!searchTerm) return tabMsgs

    return tabMsgs.filter((msg) => {
      const senderName = getSenderName(msg.sender_id)
      const recipient = msg.recipient_email || msg.recipient || ''
      return [
        senderName,
        recipient,
        msg.subject,
        msg.message_body,
        msg.body
      ]
        .map((value) => String(value || ''))
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    })
  }, [messages, activeTab, user, profile, searchTerm, directory])

  // Select a message and automatically mark it as read if unread and sent to current user
  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg)
    setThreadMessages([])
    await loadThread(msg.email_id)
    await loadMessageReactions(msg.email_id)
    await loadReadReceipts(msg.email_id)
    await loadMessageImages(msg.email_id)
    const myEmail = String(profile?.email || user?.email || '').trim().toLowerCase()
    const recipientClean = String(msg.recipient_email || msg.recipient || '').trim().toLowerCase()

    if ((recipientClean === myEmail || recipientClean === 'all') && !msg.is_read) {
      try {
        await emailService.markAsRead(msg.email_id)
        await markMessageRead(msg.email_id, profile?.employee_id)
        setMessages((prev) =>
          prev.map((m) => (m.email_id === msg.email_id ? { ...m, is_read: true } : m))
        )
      } catch (err) {
        console.error('[EmailsPage] Error marking message as read:', err)
      }
    }
  }

  // Delete current message
  const handleDeleteMessage = async (emailId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this message deletion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    })

    if (result.isConfirmed) {
      try {
        await emailService.deleteMessage(emailId)
        await alertService.success('Message has been deleted.', 'Deleted!')
        if (selectedMessage?.email_id === emailId) {
          setSelectedMessage(null)
        }
        loadData()
      } catch (err) {
        await alertService.error(err.message || 'Unable to delete message.', 'Error')
      }
    }
  }

  const openCompose = (prefilledRecipient = '', prefilledSubject = '', replyTo = null) => {
    setComposeRecipient(prefilledRecipient)
    setComposeSubject(prefilledSubject)
    setComposeReplyTo(replyTo)
    setIsComposeOpen(true)
  }

  const closeCompose = () => {
    setIsComposeOpen(false)
    setComposeRecipient('')
    setComposeSubject('')
    setComposeReplyTo(null)
  }

  const handleComposeSubmit = async ({ recipient, subject, body, files = [] }) => {
    setIsSubmitting(true)
    try {
      const primaryFile = files[0] || null
      const additionalFiles = files.slice(1)

      const createdEmail = await sendMessageWithAttachments({
        senderId: profile?.employee_id,
        recipientEmail: recipient,
        subject,
        messageBody: body,
        file: primaryFile,
        folder: 'inbox',
        replyToEmailId: composeReplyTo
      })

      const emailId = createdEmail?.email_id || composeReplyTo
      for (const file of additionalFiles) {
        try {
          await uploadMessageImage(emailId, file)
        } catch (imageError) {
          console.error('[EmailsPage] Failed to upload additional image:', imageError)
        }
      }

      if (recipient === 'all') {
        await Promise.allSettled(
          directory
            .filter((emp) => emp.employee_id !== profile?.employee_id)
            .map((emp) =>
              notificationService.createNotification({
                title: 'New Broadcast Message',
                message: `${profile?.first_name} ${profile?.last_name} sent a message to all employees: "${subject}"`,
                type: 'message',
                userId: emp.user_id || user?.id,
                notifyTo: emp.employee_id
              })
            )
        )
      } else {
        const recipientEmployee = directory.find(
          (e) => String(e.email || '').trim().toLowerCase() === String(recipient).trim().toLowerCase()
        )
        if (recipientEmployee) {
          await notificationService.createNotification({
            title: 'New Message',
            message: `${profile?.first_name} ${profile?.last_name} sent you a message: "${subject}"`,
            type: 'message',
            userId: recipientEmployee.user_id || user?.id,
            notifyTo: recipientEmployee.employee_id
          })
        }
      }

      await alertService.success('Your message was sent successfully!', 'Message Sent')
      closeCompose()
      loadData()
      if (selectedMessage) {
        loadThread(selectedMessage.email_id)
      }
    } catch (error) {
      console.error(error.message)
      await alertService.error('Unable to send message.', 'Failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle reply helper
  const handleReply = (msg) => {
    const senderEmp = directory.find((e) => e.employee_id === msg.sender_id)
    const replyRecipient = senderEmp ? senderEmp.email : msg.recipient_email
    const reSubject = String(msg.subject || '').startsWith('Re:') ? msg.subject : `Re: ${msg.subject || 'No Subject'}`
    openCompose(replyRecipient, reSubject, msg.email_id)
  }

  const loadMessageReactions = async (emailId) => {
    try {
      const [summary, list] = await Promise.all([
        getMessageReactionSummary(emailId),
        getMessageReactions(emailId),
      ])
      setReactionSummaries((prev) => ({ ...prev, [emailId]: summary }))
      if (profile?.employee_id && list.length > 0) {
        const mine = list.find((r) => r.employee_id === profile.employee_id)
        if (mine) {
          setUserReactions((prev) => ({ ...prev, [emailId]: mine.reaction_type }))
        }
      }
    } catch (error) {
      console.error('[EmailsPage] Error loading reactions:', error)
    }
  }

  const loadReadReceipts = async (emailId) => {
    try {
      const receipts = await getMessageReadReceipts(emailId)
      setReadReceipts(receipts || [])
    } catch (error) {
      console.error('[EmailsPage] Error loading read receipts:', error)
      setReadReceipts([])
    }
  }

  const loadMessageImages = async (emailId) => {
    try {
      const images = await getMessageImages(emailId)
      setMessageImages((prev) => ({ ...prev, [emailId]: images }))
    } catch (error) {
      console.error('[EmailsPage] Error loading message images:', error)
      setMessageImages((prev) => ({ ...prev, [emailId]: [] }))
    }
  }

  const handleDeleteMessageImage = async (emailAttachmentId) => {
    try {
      await deleteMessageImage(emailAttachmentId)
      setMessageImages((prev) => {
        const updated = { ...prev }
        for (const emailId in updated) {
          updated[emailId] = updated[emailId].filter((img) => img.email_attachment_id !== emailAttachmentId)
        }
        return updated
      })
      await alertService.success('Image removed from view.', 'Removed')
    } catch (error) {
      await alertService.error(error.message || 'Unable to remove image.', 'Error')
    }
  }

  const handleMessageReaction = async (emailId, reactionType) => {
    if (!profile?.employee_id) return
    setReactionLoading((prev) => ({ ...prev, [emailId]: true }))
    try {
      await addMessageReaction(emailId, profile.employee_id, reactionType)
      setUserReactions((prev) => ({ ...prev, [emailId]: reactionType }))
      await loadMessageReactions(emailId)
    } catch (error) {
      console.error(error.message)
      await alertService.error('Unable to update reaction.', 'Reaction Failed')
    } finally {
      setReactionLoading((prev) => ({ ...prev, [emailId]: false }))
    }
  }

  // Count helper functions for badge indicators
  const inboxUnreadCount = useMemo(() => {
    const myEmail = String(profile?.email || user?.email || '').trim().toLowerCase()
    const myEmployeeId = profile?.employee_id
    return messages.filter(
      (m) =>
        (m.recipient_email === myEmail || m.recipient_email === 'all') &&
        !m.is_read &&
        m.sender_id !== myEmployeeId
    ).length
  }, [messages, user, profile])

  const inboxCount = useMemo(() => {
    const myEmail = String(profile?.email || user?.email || '').trim().toLowerCase()
    const myEmployeeId = profile?.employee_id
    return messages.filter(
      (m) =>
        (m.recipient_email === myEmail || m.recipient_email === 'all') &&
        m.sender_id !== myEmployeeId
    ).length
  }, [messages, user, profile])

  const sentCount = useMemo(() => {
    return messages.filter((m) => m.sender_id === profile?.employee_id).length
  }, [messages, profile])

  return (
    <DashboardLayout>
      <main className="content emails-page">
        <PageHeader
          title="Internal Messages"
          actions={[
            <SearchBar
              key="search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={`Search messages...`}
              title="Search internal messages"
            />,
            <Button
              key="compose"
              variant="primary"
              onClick={() => openCompose()}
              title="Compose a new internal message"
              style={{ marginLeft: '10px' }}
            >
              Compose Message
            </Button>
          ]}
        />

        <div className="internal-messaging-grid" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '240px 1fr',
          gap: isMobile ? '12px' : '20px',
          marginTop: '10px'
        }}>
          {/* Folders Sidebar */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: '8px',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? '4px' : '0'
          }}>
            <button
              onClick={() => {
                setActiveTab('inbox')
                setSelectedMessage(null)
              }}
              title="View inbox messages"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isMobile ? '8px 12px' : '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'inbox' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === 'inbox' ? '#2563eb' : 'inherit',
                fontWeight: activeTab === 'inbox' ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, color 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                📥 Inbox
              </span>
              <span style={{
                backgroundColor: activeTab === 'inbox' ? '#2563eb' : 'rgba(148, 163, 184, 0.15)',
                color: activeTab === 'inbox' ? '#fff' : 'inherit',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {inboxCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('unread')
                setSelectedMessage(null)
              }}
              title="View unread messages"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isMobile ? '8px 12px' : '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'unread' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === 'unread' ? '#2563eb' : 'inherit',
                fontWeight: activeTab === 'unread' ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, color 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                🔵 Unread
              </span>
              {inboxUnreadCount > 0 && (
                <span style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {inboxUnreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('sent')
                setSelectedMessage(null)
              }}
              title="View sent messages"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isMobile ? '8px 12px' : '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'sent' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === 'sent' ? '#2563eb' : 'inherit',
                fontWeight: activeTab === 'sent' ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, color 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px' }}>
                📤 Sent
              </span>
              <span style={{
                backgroundColor: activeTab === 'sent' ? '#2563eb' : 'rgba(148, 163, 184, 0.15)',
                color: activeTab === 'sent' ? '#fff' : 'inherit',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {sentCount}
              </span>
            </button>
          </div>

          {/* Core Split Pane (Message List and Message Viewer) */}
          <div className="messaging-pane" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            minHeight: isMobile ? 'auto' : '600px',
            overflow: 'hidden'
          }}>
            {/* Message List Column */}
            <div style={{
              borderRight: isMobile ? 'none' : '1px solid var(--border-color, #e2e8f0)',
              borderBottom: isMobile ? '1px solid var(--border-color, #e2e8f0)' : 'none',
              overflowY: 'auto',
              maxHeight: isMobile ? '300px' : '600px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {isLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>Loading messages...</div>
              ) : filteredMessages.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                  No messages in {activeTab}.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isUnread = !msg.is_read && activeTab !== 'sent'
                  const isSelected = selectedMessage?.email_id === msg.email_id
                   return (
                     <div
                       key={msg.email_id}
                       onClick={() => handleSelectMessage(msg)}
                       className="email-message-item"
                       style={{
                         padding: isMobile ? '12px' : '16px',
                         borderBottom: '1px solid var(--border-color, #f1f5f9)',
                         cursor: 'pointer',
                         backgroundColor: isSelected
                           ? 'rgba(37, 99, 235, 0.05)'
                           : isUnread
                             ? 'rgba(37, 99, 235, 0.02)'
                             : 'transparent',
                         transition: 'background-color 0.2s ease',
                         position: 'relative',
                         borderLeft: isUnread ? '4px solid #2563eb' : '4px solid transparent'
                       }}
                       title={`Read message: ${msg.subject || 'No Subject'}`}
                     >
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                         <span style={{
                           fontWeight: isUnread ? '700' : '600',
                           fontSize: isMobile ? '13px' : '14px',
                           color: isUnread ? '#2563eb' : 'inherit',
                           overflow: 'hidden',
                           textOverflow: 'ellipsis',
                           whiteSpace: 'nowrap'
                         }} className="email-text-primary">
                            {activeTab === 'sent' ? `Recipient: ${getRecipientName(msg.recipient_email)}` : getSenderName(msg.sender_id)}
                         </span>
                         <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)', flexShrink: 0 }} className="email-text-secondary">
                           {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                         </span>
                       </div>
                       <div style={{
                         fontWeight: isUnread ? '700' : '500',
                         fontSize: isMobile ? '12px' : '13px',
                         marginBottom: '4px',
                         overflow: 'hidden',
                         textOverflow: 'ellipsis',
                         whiteSpace: 'nowrap'
                       }}>
                         {msg.subject || '(No Subject)'}
                         </div>
                       <div style={{
                           fontSize: isMobile ? '11px' : '12px',
                           color: 'var(--text-secondary, #64748b)',
                           overflow: 'hidden',
                           textOverflow: 'ellipsis',
                           whiteSpace: 'nowrap'
                         }} className="email-text-secondary">
                           {msg.message_body || msg.body || ''}
                         </div>
                       </div>
                   )
                })
              )}
            </div>

            {/* Message Viewer Column */}
            <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', maxHeight: isMobile ? '400px' : '600px', display: 'flex', flexDirection: 'column', justifyContent: selectedMessage ? 'flex-start' : 'center', alignItems: selectedMessage ? 'stretch' : 'center' }} className="email-viewer">
              {selectedMessage ? (
                <div>
                  {(threadMessages.length > 0 ? threadMessages : [selectedMessage]).map((threadMsg, idx) => {
                    const isOriginal = idx === 0
                    return (
                      <div key={threadMsg.email_id || idx} style={{ marginBottom: isOriginal ? 0 : 24, paddingBottom: isOriginal ? 0 : 24, borderBottom: isOriginal ? 'none' : '1px solid var(--border-color, #e2e8f0)' }}>
                        {isOriginal && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', marginBottom: '8px' }}>
                                {selectedMessage.subject || 'No Subject'}
                              </h2>
                               <div style={{ fontSize: isMobile ? '13px' : '14px', color: 'var(--text-secondary, #64748b)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                 <span><strong>Sender:</strong> {getSenderName(selectedMessage.sender_id)}</span>
                                 <span><strong>Recipient:</strong> {getRecipientName(selectedMessage.recipient_email)}</span>
                                 <span><strong>Date:</strong> {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString() : 'No date'}</span>
                               </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              {activeTab !== 'sent' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReply(selectedMessage)}
                                  title="Reply to this message"
                                >
                                  Reply
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteMessage(selectedMessage.email_id)}
                                title="Delete this message"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}

                         <div style={{
                           fontSize: '15px',
                           lineHeight: '1.6',
                           whiteSpace: 'pre-wrap',
                           padding: isOriginal ? '20px' : '16px',
                           borderRadius: '8px',
                           backgroundColor: isOriginal ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.02)',
                           border: `1px solid ${isOriginal ? 'var(--border-color, #f1f5f9)' : 'transparent'}`,
                           minHeight: isOriginal ? '200px' : 'auto'
                         }} className="email-bg-subtle">
                           {!isOriginal && (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }} className="email-text-muted">
                                 <strong>Sender:</strong> {getSenderName(threadMsg.sender_id)} &nbsp;|&nbsp; <strong>Recipient:</strong> {getRecipientName(threadMsg.recipient_email)} &nbsp;|&nbsp; {threadMsg.created_at ? new Date(threadMsg.created_at).toLocaleString() : ''}
                              </div>
                            )}  
                            {threadMsg.message_body || threadMsg.body || 'No message body.'}
                          </div>
                           {isOriginal && (() => {
                             const primaryImage = selectedMessage.attachment_url
                             const additionalImages = messageImages[selectedMessage.email_id] || []
                             const allImages = [
                               ...(primaryImage ? [{ image_url: primaryImage, email_attachment_id: null, file_name: primaryImage.split('/').pop() }] : []),
                               ...additionalImages
                             ]

                             if (allImages.length === 0) return null

                             return (
                               <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', border: '1px dashed #d1d5db', backgroundColor: '#f9fafb' }}>
                                 <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#374151' }}>
                                   Images
                                 </div>
                                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                   {allImages.map((img, idx) => (
                                     <div key={img.email_attachment_id || idx} style={{ position: 'relative', display: 'inline-block' }}>
                                       <img
                                         src={img.image_url}
                                         alt={img.file_name || `Image ${idx + 1}`}
                                         style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '6px', border: '1px solid #e5e7eb', objectFit: 'cover' }}
                                       />
                                       <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                                         <button
                                           onClick={(e) => { e.stopPropagation(); handleDeleteMessageImage(img.email_attachment_id) }}
                                           title="Remove image from view"
                                           style={{
                                             padding: '2px 6px',
                                             borderRadius: '4px',
                                             border: 'none',
                                             backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                             color: '#fff',
                                             cursor: 'pointer',
                                             fontSize: '11px',
                                             fontWeight: '600'
                                           }}
                                         >
                                           ✕
                                         </button>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )
                           })()}
                           {isOriginal && (
                            <div style={{ marginTop: 16 }} onClick={(event) => event.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                 {MESSAGE_REACTION_TYPES.map((reaction) => {
                                   const count = reactionSummaries[selectedMessage.email_id]?.[reaction.value] || 0
                                   const isActive = userReactions[selectedMessage.email_id] === reaction.value
                                   return (
                                     <button
                                       key={reaction.value}
                                       onClick={() => handleMessageReaction(selectedMessage.email_id, reaction.value)}
                                       disabled={reactionLoading[selectedMessage.email_id]}
                                       title={reaction.label}
                                       style={{
                                         padding: '4px 10px',
                                         borderRadius: 16,
                                         border: isActive ? '1px solid #2563eb' : '1px solid #d1d5db',
                                         backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : '#fff',
                                         color: isActive ? '#2563eb' : '#374151',
                                         cursor: reactionLoading[selectedMessage.email_id] ? 'not-allowed' : 'pointer',
                                         fontSize: 12,
                                         fontWeight: isActive ? '600' : '500',
                                         opacity: reactionLoading[selectedMessage.email_id] ? 0.7 : 1,
                                       }}
                                     >
                                       {reaction.icon}
                                       {count > 0 && <span style={{ marginLeft: 4, fontSize: 12 }}>{count}</span>}
                                     </button>
                                   )
                                 })}
                              </div>
                              {readReceipts.length > 0 && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                                  Read by: {readReceipts.map((r) => r.employee_name).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>Select a message to read</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ComposeMessageModal
        visible={isComposeOpen}
        onClose={closeCompose}
        onSubmit={handleComposeSubmit}
        employees={directory}
        isLoadingDirectory={false}
        isSubmitting={isSubmitting}
        defaultRecipient={composeRecipient}
        defaultSubject={composeSubject}
      />
    </DashboardLayout>
  )
}

export default EmailsPage
