import { useEffect, useState } from 'react'
import Modal from '../Modal'
import RecipientSelect from './RecipientSelect'
import { alertService } from '../../utils/alertService'

export default function ComposeMessageModal({
  visible,
  onClose,
  onSubmit,
  employees = [],
  isLoadingDirectory = false,
  isSubmitting = false,
  defaultRecipient = '',
  defaultSubject = ''
}) {
  const [recipient, setRecipient] = useState(defaultRecipient)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState('')

  useEffect(() => {
    if (visible) {
      setRecipient(defaultRecipient)
      setSubject(defaultSubject)
      setBody('')
    }
  }, [visible, defaultRecipient, defaultSubject])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!recipient) {
      alertService.warning('Please select a recipient employee.')
      return
    }
    if (!subject.trim()) {
      alertService.warning('Please enter a subject.')
      return
    }
    if (!body.trim()) {
      alertService.warning('Please write a message body.')
      return
    }

    await onSubmit({
      recipient,
      subject: subject.trim(),
      body: body.trim()
    })
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="New Internal Message"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="compose-message-form"
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      }
      loading={isSubmitting}
    >
      <form id="compose-message-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              htmlFor="compose-recipient"
              style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Recipient Employee
            </label>
            <RecipientSelect
              id="compose-recipient"
              value={recipient}
              onChange={setRecipient}
              employees={employees}
              isLoading={isLoadingDirectory}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="compose-subject"
              style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Subject
            </label>
            <input
              id="compose-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Enter subject"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="compose-body"
              style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Message Body
            </label>
            <textarea
              id="compose-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your message here..."
              rows="6"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '140px',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
