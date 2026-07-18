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
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    if (visible) {
      setRecipient(defaultRecipient)
      setSubject(defaultSubject)
      setBody('')
      setAttachments([])
    }
  }, [visible, defaultRecipient, defaultSubject])

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    event.target.value = ''
  }

  const handlePaste = (event) => {
    const items = event.clipboardData?.items || []
    const imageFiles = Array.from(items)
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean)

    if (imageFiles.length > 0) {
      event.preventDefault()
      setAttachments((prev) => [...prev, ...imageFiles])
    }
  }

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

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
      body: body.trim(),
      files: attachments
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
                onPaste={handlePaste}
                placeholder="Write your message here... (paste screenshots with Ctrl+V)"
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

          <div>
            <label
              htmlFor="compose-images"
              style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              Images
            </label>
            <input
              id="compose-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="compose-images"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px dashed #94a3b8',
                backgroundColor: '#f8fafc',
                color: '#334155',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {attachments.length > 0 ? `Add more images (${attachments.length} selected)` : 'Attach images'}
            </label>
            {attachments.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: '700',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {file.type?.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        'IMG'
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      disabled={isSubmitting}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '18px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        lineHeight: 1,
                        opacity: isSubmitting ? 0.5 : 1
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
