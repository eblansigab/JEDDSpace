import { supabaseClient } from '../supabase/supabaseClient'

const LOCAL_DOCUMENTS_KEY = 'jeddspace_uploaded_documents'

const getLocalDocuments = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DOCUMENTS_KEY) || '[]')
  } catch {
    return []
  }
}

const saveLocalDocuments = (documents) => {
  localStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(documents))
}

const getDocumentDate = (document) =>
  document.created_at || document.uploaded_at || document.date || ''

const sortDocuments = (documents) =>
  documents.sort((a, b) => new Date(getDocumentDate(b)) - new Date(getDocumentDate(a)))

export const documentService = {
  async getAllDocuments() {
    const localDocuments = getLocalDocuments()

    const { data, error } = await supabaseClient
      .from('document')
      .select('*')

    if (error) {
      return localDocuments
    }

    return sortDocuments([...localDocuments, ...(data || [])])
  },

  async getUploadHistory(userId) {
    const localDocuments = getLocalDocuments().filter((item) => !userId || item.uploaded_by === userId)

    const { data, error } = await supabaseClient
      .from('document')
      .select('*')

    if (error) {
      return localDocuments
    }

    const remoteDocuments = userId
      ? (data || []).filter((item) => !item.uploaded_by || String(item.uploaded_by) === String(userId))
      : data || []

    return sortDocuments([...localDocuments, ...remoteDocuments])
  },

  async recordUpload(file, userId) {
    const localRecord = {
      id: `local-${Date.now()}`,
      document_id: `LOCAL-${Date.now()}`,
      title: file.name,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'Unknown',
      uploaded_by: userId || null,
      created_at: new Date().toISOString()
    }

    saveLocalDocuments([localRecord, ...getLocalDocuments()])

    return localRecord
  }
}
