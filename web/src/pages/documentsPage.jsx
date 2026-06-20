import { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader } from '../components'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { alertService } from '../utils/alertService'
import { supabaseClient } from '../supabase/supabaseClient'

const DocumentsPage = () => {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const loadFiles = async () => {
    const data = await documentService.getAllDocuments()
    setFiles(data || [])
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      await documentService.recordUpload(file, user?.id)
      await alertService.success(`${file.name} has been added to documents.`, 'File Uploaded')
      await loadFiles()
    } catch (error) {
      await alertService.error(error.message || 'Unable to upload file.', 'Upload Failed')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const toggleExpand = (docId) => {
    setExpandedId((current) => (current === docId ? null : docId))
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Documents"
          actions={[
            <Button key="upload" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          ]}
        />
        <p>Uploaded files are listed here for tracking and review.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(files || []).map((file) => {
            const fileName = file.title || file.file_name || file.name || 'Untitled document'
            const fileType = file.file_type || 'Unknown'
            const uploadedOn = file.created_at ? new Date(file.created_at).toLocaleDateString() : 'No date'
            const url = file.file_path || file.file_url || ''
            const isExpanded = expandedId === file.document_id || expandedId === file.id

            return (
              <div
                key={file.document_id || file.id}
                style={{
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 10,
                  background: '#fff',
                  overflow: 'hidden'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(file.document_id || file.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit'
                  }}
                  title={isExpanded ? 'Hide details' : 'Show details'}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{fileName}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderTop: '1px solid var(--border-color, #e2e8f0)',
                      background: 'rgba(148, 163, 184, 0.05)'
                    }}
                  >
                    <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                      <div style={{ fontSize: 13 }}>
                        <strong>Type:</strong> {fileType}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <strong>Uploaded On:</strong> {uploadedOn}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="primary-btn"
                          style={{ padding: '8px 12px', textDecoration: 'none' }}
                        >
                          View
                        </a>
                      ) : null}

                      {url ? (
                        <a
                          href={url}
                          download={fileName}
                          className="primary-btn"
                          style={{ padding: '8px 12px', textDecoration: 'none' }}
                        >
                          Download
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {!files.length && (
            <p style={{ color: '#64748b', fontSize: 14 }}>No documents uploaded yet.</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      </main>
    </DashboardLayout>
  )
}

export default DocumentsPage
