import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, SearchBar, Table } from '../components'
import { useAuth } from '../services/authContext'
import { emailService } from '../services/emailService'
import { alertService } from '../utils/alertService'

const EmailsPage = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [messages, setMessages] = useState([])
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)

  const loadEmails = async () => {
    const data = await emailService.getEmailLogs()
    setMessages(data)
  }

  useEffect(() => {
    loadEmails()
  }, [])

  const handleSend = async () => {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      await alertService.warning('Please complete the recipient, subject, and message.', 'Missing Details')
      return
    }

    setIsSending(true)

    try {
      await emailService.createEmailLog({
        recipient,
        subject,
        body,
        type: 'manual',
        userId: user?.id
      })

      await alertService.success('Email has been logged successfully.', 'Email Logged')
      setRecipient('')
      setSubject('')
      setBody('')
      loadEmails()
    } catch (error) {
      await alertService.error(error.message || 'Unable to log email.', 'Send Failed')
    } finally {
      setIsSending(false)
    }
  }

  const filteredMessages = useMemo(
    () =>
      messages.filter((msg) =>
        [
          msg.sender,
          msg.recipient,
          msg.subject,
          msg.body,
          msg.created_at
        ].map((value) => value || '').join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [messages, searchTerm]
  )

  const columns = [
    { key: 'recipient', title: 'Recipient', render: (value) => value || 'All employees' },
    { key: 'subject', title: 'Subject', render: (value) => value || 'No subject' },
    {
      key: 'created_at',
      title: 'Time',
      render: (value) => (value ? new Date(value).toLocaleString() : 'Logged')
    }
  ]

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader
            title="Emails"
            actions={[
              <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search inbox..." />
            ]}
          />

          <div className="email-layout">
            <section className="inbox">
              <Table columns={columns} data={filteredMessages} />
            </section>

            <section className="compose">
              <h3>Compose Email</h3>
              <label>To:</label>
              <input type="text" placeholder="Enter recipient email" value={recipient} onChange={(event) => setRecipient(event.target.value)} />

              <label>Subject:</label>
              <input type="text" placeholder="Enter subject" value={subject} onChange={(event) => setSubject(event.target.value)} />

              <label>Message:</label>
              <textarea rows="6" placeholder="Write your message here..." value={body} onChange={(event) => setBody(event.target.value)} />

              <Button variant="primary" style={{ marginTop: 12 }} onClick={handleSend} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default EmailsPage
