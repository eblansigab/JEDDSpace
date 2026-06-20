import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, SearchBar } from '../components'
import { useAuth } from '../services/authContext'
import { emailService } from '../services/emailService'
import { employeeService } from '../services/employeeService'
import { notificationService } from '../services/notificationService'
import { alertService } from '../utils/alertService'
import Swal from 'sweetalert2'
import { supabaseClient } from '../supabase/supabaseClient'

const EmailsPage = () => {
  const { user, profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [messages, setMessages] = useState([])
  const [directory, setDirectory] = useState([])
  const [activeTab, setActiveTab] = useState('inbox') // 'inbox', 'sent', 'unread'
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [emailData, dirData] = await Promise.all([
        emailService.getEmailLogs(),
        employeeService.getDirectory()
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
    if (email === 'all employees' || email === 'all') return 'All Employees'
    const emp = directory.find((e) => String(e.email).trim().toLowerCase() === String(email).trim().toLowerCase())
    return emp ? `${emp.first_name} ${emp.last_name}` : email
  }

  // Filter messages based on active tab and search term
  const filteredMessages = useMemo(() => {
    const myEmail = String(user?.email || '').trim().toLowerCase()
    const myEmployeeId = profile?.employee_id

    const tabMsgs = messages.filter((msg) => {
      const recipientClean = String(msg.recipient_email || msg.recipient || '').trim().toLowerCase()
      const isSentByMe = msg.sender_id === myEmployeeId

      if (activeTab === 'sent') {
        return isSentByMe
      } else if (activeTab === 'unread') {
        return (recipientClean === myEmail || recipientClean === 'all employees' || recipientClean === 'all') && !msg.is_read && !isSentByMe
      } else {
        // inbox folder
        return (recipientClean === myEmail || recipientClean === 'all employees' || recipientClean === 'all') && !isSentByMe
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
    const myEmail = String(user?.email || '').trim().toLowerCase()
    const recipientClean = String(msg.recipient_email || msg.recipient || '').trim().toLowerCase()

    if ((recipientClean === myEmail || recipientClean === 'all employees' || recipientClean === 'all') && !msg.is_read) {
      try {
        await emailService.markAsRead(msg.email_id)
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

  // Compose new message with optional prefilled parameters (for reply)
  const handleCompose = (prefilledRecipient = '', prefilledSubject = '') => {
    // Generate select options of employees in directory
    const employeeOptionsHtml = directory
      .map(
        (emp) =>
          `<option value="${emp.email}" ${prefilledRecipient.toLowerCase() === emp.email.toLowerCase() ? 'selected' : ''}>${emp.first_name} ${emp.last_name} (${emp.email})</option>`
      )
      .join('')

    Swal.fire({
      title: 'New Internal Message',
      html: `
        <div style="text-align: left; font-family: inherit;">
          <label style="font-weight: 600; display: block; margin-bottom: 5px; font-size: 14px;">Recipient Employee:</label>
          <select id="swal-recipient" class="swal2-input" style="width: 100%; margin: 0 0 15px 0; font-size: 14px;">
            <option value="">-- Select Recipient --</option>
            <option value="all" ${prefilledRecipient === 'all' ? 'selected' : ''}>All Employees</option>
            ${employeeOptionsHtml}
          </select>

          <label style="font-weight: 600; display: block; margin-bottom: 5px; font-size: 14px;">Subject:</label>
          <input type="text" placeholder="Enter subject" id="swal-subject" value="${prefilledSubject}" class="swal2-input" style="width: 100%; margin: 0 0 15px 0; font-size: 14px;" />

          <label style="font-weight: 600; display: block; margin-bottom: 5px; font-size: 14px;">Message Body:</label>
          <textarea rows="6" placeholder="Write your message here..." id="swal-body" class="swal2-textarea" style="width: 100%; margin: 0; min-height: 140px; font-size: 14px; font-family: inherit;"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Send',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const recipient = document.getElementById('swal-recipient').value
        const subject = document.getElementById('swal-subject').value.trim()
        const body = document.getElementById('swal-body').value.trim()

        if (!recipient) {
          Swal.showValidationMessage('Please select a recipient employee.')
          return false
        }
        if (!subject) {
          Swal.showValidationMessage('Please enter a subject.')
          return false
        }
        if (!body) {
          Swal.showValidationMessage('Please write a message body.')
          return false
        }

        return { recipient, subject, body }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoading(true)
        try {
          // 1. Create message log in DB
          await emailService.createEmailLog({
            recipient: result.value.recipient,
            subject: result.value.subject,
            body: result.value.body,
            type: 'inbox',
            senderId: profile?.employee_id
          })

          // 2. Integration with notification system
          if (result.value.recipient === 'all' || result.value.recipient === 'all employees') {
            // Notify all employees
            await Promise.allSettled(
              directory
                .filter((emp) => emp.employee_id !== profile?.employee_id)
                .map((emp) =>
                  notificationService.createNotification({
                    title: 'New Broadcast Message',
                    message: `${profile?.first_name} ${profile?.last_name} sent a message to all employees: "${result.value.subject}"`,
                    type: 'general',
                    userId: user?.id,
                    notifyTo: emp.employee_id
                  })
                )
            )
          } else {
            // Notify specific employee
            const recipientEmployee = directory.find(
              (e) => String(e.email).trim().toLowerCase() === String(result.value.recipient).trim().toLowerCase()
            )
            if (recipientEmployee) {
              await notificationService.createNotification({
                title: 'New Message',
                message: `${profile?.first_name} ${profile?.last_name} sent you a message: "${result.value.subject}"`,
                type: 'general',
                userId: user?.id,
                notifyTo: recipientEmployee.employee_id
              })
            }
          }

          await alertService.success('Your message was sent successfully!', 'Message Sent')
          loadData()
        } catch (error) {
          await alertService.error(error.message || 'Unable to send message.', 'Failed')
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  // Handle reply helper
  const handleReply = (msg) => {
    const senderEmp = directory.find((e) => e.employee_id === msg.sender_id)
    const replyRecipient = senderEmp ? senderEmp.email : msg.recipient_email
    const reSubject = String(msg.subject || '').startsWith('Re:') ? msg.subject : `Re: ${msg.subject || 'No Subject'}`
    handleCompose(replyRecipient, reSubject)
  }

  // Count helper functions for badge indicators
  const inboxUnreadCount = useMemo(() => {
    const myEmail = String(user?.email || '').trim().toLowerCase()
    const myEmployeeId = profile?.employee_id
    return messages.filter(
      (m) =>
        (m.recipient_email === myEmail || m.recipient_email === 'All employees' || m.recipient_email === 'all') &&
        !m.is_read &&
        m.sender_id !== myEmployeeId
    ).length
  }, [messages, user, profile])

  const inboxCount = useMemo(() => {
    const myEmail = String(user?.email || '').trim().toLowerCase()
    const myEmployeeId = profile?.employee_id
    return messages.filter(
      (m) =>
        (m.recipient_email === myEmail || m.recipient_email === 'All employees' || m.recipient_email === 'all') &&
        m.sender_id !== myEmployeeId
    ).length
  }, [messages, user, profile])

  const sentCount = useMemo(() => {
    return messages.filter((m) => m.sender_id === profile?.employee_id).length
  }, [messages, profile])

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Messages"
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
              onClick={() => handleCompose()}
              title="Compose a new internal message"
              style={{ marginLeft: '10px' }}
            >
              Compose Message
            </Button>
          ]}
        />

        <div className="internal-messaging-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', marginTop: '10px' }}>
          {/* Folders Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'inbox' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === 'inbox' ? '#2563eb' : 'inherit',
                fontWeight: activeTab === 'inbox' ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, color 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'unread' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === 'unread' ? '#2563eb' : 'inherit',
                fontWeight: activeTab === 'unread' ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, color 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'sent' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === 'sent' ? '#2563eb' : 'inherit',
                fontWeight: activeTab === 'sent' ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s ease, color 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            gridTemplateColumns: '380px 1fr',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            minHeight: '600px',
            overflow: 'hidden'
          }}>
            {/* Message List Column */}
            <div style={{
              borderRight: '1px solid var(--border-color, #e2e8f0)',
              overflowY: 'auto',
              maxHeight: '600px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {isLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading messages...</div>
              ) : filteredMessages.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
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
                      style={{
                        padding: '16px',
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{
                          fontWeight: isUnread ? '700' : '600',
                          fontSize: '14px',
                          color: isUnread ? '#2563eb' : 'inherit'
                        }}>
                          {activeTab === 'sent' ? `To: ${getRecipientName(msg.recipient_email)}` : getSenderName(msg.sender_id)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div style={{
                        fontWeight: isUnread ? '700' : '500',
                        fontSize: '13px',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {msg.subject || '(No Subject)'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {msg.message_body || msg.body || ''}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Message Viewer Column */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '600px', display: 'flex', flexDirection: 'column', justifyContent: selectedMessage ? 'flex-start' : 'center', alignItems: selectedMessage ? 'stretch' : 'center' }}>
              {selectedMessage ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                        {selectedMessage.subject || 'No Subject'}
                      </h2>
                      <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span><strong>From:</strong> {getSenderName(selectedMessage.sender_id)}</span>
                        <span><strong>To:</strong> {getRecipientName(selectedMessage.recipient_email)}</span>
                        <span><strong>Date:</strong> {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString() : 'N/A'}</span>
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

                  <div style={{
                    fontSize: '15px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(148, 163, 184, 0.05)',
                    border: '1px solid var(--border-color, #f1f5f9)',
                    minHeight: '200px'
                  }}>
                    {selectedMessage.message_body || selectedMessage.body || 'No message body.'}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>Select a message to read</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default EmailsPage
