import { supabaseClient } from '../supabase/supabaseClient'

const LOCAL_DOCUMENTS_KEY = 'jeddspace_uploaded_document'

const getLocalDocuments = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DOCUMENTS_KEY) || '[]')
  } catch {
    return []
  }
}

const saveLocalDocuments = (document) => {
  localStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(document))
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

  const fileName = `${Date.now()}-${file.name}`

  // Upload file
  const { error: uploadError } =
    await supabaseClient.storage
      .from('document')
      .upload(fileName, file)

  if (uploadError) throw uploadError

  // Get URL
  const { data: publicUrlData } =
    supabaseClient.storage
      .from('document')
      .getPublicUrl(fileName)

  // Save metadata
  const { data, error } =
    await supabaseClient
      .from('document')
      .insert({
        uploaded_by: userId,

        title: file.name,
        file_name: file.name,
        file_path: publicUrlData.publicUrl,
        file_type: file.type,
        file_size: file.size
      })
      .select()
      .single()

  if (error) throw error

  return data
}
}
