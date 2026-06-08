import { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, Table } from '../components'
import { useAuth } from '../services/authContext'
import { documentService } from '../services/documentService'
import { alertService } from '../utils/alertService'
import { supabaseClient } from '../supabase/supabaseClient'

const DocumentsPage = () => {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  const loadFiles = async () => {
    const data = await documentService.getAllDocuments()
    setFiles(data)
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

  const columns = [
    {
      key: 'title',
      title: 'File Name',
      render: (value, row) => value || row.file_name || row.name || 'Untitled document'
    },
    {
      key: 'file_type',
      title: 'Type',
      render: (value) => value || 'Unknown'
    },
    {
      key: 'created_at',
      title: 'Uploaded On',
      render: (value, row) => {
        const date = value || row.date
        return date ? new Date(date).toLocaleDateString() : 'No date'
      }
    }
    ,
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => {
        const url = row.file_path || row.file_url || ''
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="primary-btn" style={{ padding: '6px 10px', textDecoration: 'none' }}>View</a>
            ) : null}

            {url ? (
              <a href={url} download={row.file_name || ''} className="primary-btn" style={{ padding: '6px 10px', textDecoration: 'none' }}>Download</a>
            ) : null}
          </div>
        )
      }
    }
  ]

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
          <Table columns={columns} data={files} />

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
