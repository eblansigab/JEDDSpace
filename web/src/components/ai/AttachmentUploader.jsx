import { useRef, useState } from 'react'
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
  'text/csv': 'CSV',
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

export default function AttachmentUploader({ attachments = [], onAdd, onRemove }) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelected = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !onAdd) return

    const validFiles = files.filter(f => ALLOWED_TYPES.includes(f.type))
    if (validFiles.length !== files.length) {
      alert('Some files were skipped due to unsupported type. Supported: PDF, TXT, CSV, DOCX, XLSX, PNG, JPG, WEBP, MP3, WAV, M4A')
    }

    for (const file of validFiles) {
      setIsUploading(true)
      await onAdd(file)
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
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? 'Uploading...' : '📎 Attach Files'}
        </Button>
        <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
          PDF, TXT, CSV, DOCX, XLSX, PNG, JPG, WEBP, MP3, WAV, M4A supported
        </span>
      </div>

      {attachments.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
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
                onClick={() => onRemove?.(att.document_id || att.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                }}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

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