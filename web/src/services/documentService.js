import { supabaseClient } from '../supabase/supabaseClient'
import { ethers } from "ethers"
import {storeHash} from "../components/contract"

const LOCAL_DOCUMENTS_KEY = 'jeddspace_uploaded_document'


const getLocalDocuments = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DOCUMENTS_KEY) || '[]')
  } catch {
    return []
  }
}

const getDocumentDate = (document) =>
  document.created_at || document.uploaded_at || document.date || ''

const sortDocuments = (documents) =>
  documents.sort((a, b) => new Date(getDocumentDate(b)) - new Date(getDocumentDate(a)))

const getAuthHeaders = async () => {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession()

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  }
}

const hashFile = async(file)=>{
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const hash = ethers.keccak256(bytes)
  return hash
}

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

  async getDocumentSummary(documentId) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: 'document',
        payload: { documentId }
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error || 'Unable to get document summary')
    }

    const result = await response.json()
    return {
      summary: result?.data?.summary || result?.summary,
      cached: Boolean(result?.data?.cached ?? result?.cached)
    }
  },

  async recordUpload(file, userId) {
    const fileName = `${Date.now()}-${file.name}`
    const hash = await hashFile(file)

    const { error: uploadError } =
      await supabaseClient.storage
        .from('document')
        .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: publicUrlData } =
      supabaseClient.storage
        .from('document')
        .getPublicUrl(fileName)

    const { data, error } =
      await supabaseClient
        .from('document')
        .insert({
          uploaded_by: userId,
          title: file.name,
          file_name: file.name,
          file_path: publicUrlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          hash: hash
        })
        .select()
        .single()

    console.log(hash)
    storeHash(file,hash)


    //const {error} = await supabaseClient.from('hash_file').insert({filename:file.name,hash:hash,})

    if (error) throw error

    return data
  }
}
