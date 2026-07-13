import { useState, useRef } from 'react'
import Button from '../Button'

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const TYPE_LABELS = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/webp': 'WEBP',
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/mp4': 'M4A',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
}

export default function ChatInput({ value, onChange, onSend, loading = false, placeholder, attachments = [], onAddAttachment, onRemoveAttachment }) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  const handleFileSelected = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !onAddAttachment) return

    const validFiles = files.filter(f => ALLOWED_TYPES.includes(f.type))
    if (validFiles.length !== files.length) {
      alert('Some files were skipped due to unsupported type.')
    }

    for (const file of validFiles) {
      setIsUploading(true)
      await onAddAttachment(file)
      setIsUploading(false)
    }
    event.target.value = ''
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className='chat-input-box'
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        background: '#dbe3ef'
      }}
    >
      {attachments.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {attachments.map((att) => (
            <div
              key={att.document_id || att.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(148, 163, 184, 0.05)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 6,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.title || att.file_name || att.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {TYPE_LABELS[att.file_type] || 'File'} • {formatFileSize(att.file_size || att.size || 0)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment?.(att.document_id || att.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          padding: 14,
          fontSize: 15,
          lineHeight: 1.5,
          outline: 'none'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach files"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            📎
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            PDF, TXT, CSV, DOCX, XLSX, PNG, JPG, WEBP, MP3, WAV, M4A
          </span>
        </div>
        <Button onClick={onSend} disabled={loading || !String(value || '').trim()}>
          {loading ? 'Thinking...' : 'Send Message'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />
    </div>
  )
}