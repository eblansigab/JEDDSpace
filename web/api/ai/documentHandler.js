import { extractDocumentContent } from './contentExtractor.js'
import { groqClient } from './groqClient.js'
import { getSummaryByType, getSupabaseServerClient, saveSummary } from './supabaseClient.js'

const loadAuthorizedDocument = async ({ viewer, documentId }) => {
  const client = getSupabaseServerClient()
  let documentQuery = client
    .from('document')
    .select('document_id, title, file_name, file_path, file_type, uploaded_by')
    .eq('document_id', documentId)

  if (!viewer.isAdmin) {
    documentQuery = documentQuery.eq('uploaded_by', viewer.user.id)
  }

  const { data, error } = await documentQuery.single()
  if (error) throw error
  return { client, document: data }
}

export const handleDocumentSummary = async ({ viewer, payload = {} }) => {
  const { documentId } = payload

  if (!documentId) {
    return { status: 400, error: 'Document ID is required' }
  }

  const cachedSummary = await getSummaryByType(`document_${documentId}`)
  if (cachedSummary?.content_summary) {
    return {
      data: {
        summary: cachedSummary.content_summary,
        cached: true,
      },
    }
  }

  const { client, document } = await loadAuthorizedDocument({ viewer, documentId })
  const extracted = await extractDocumentContent({ client, document, useCache: true })
  const extractedText = extracted.content || `Document: ${document.title || document.file_name}. Content extraction is unavailable.`

  const prompt = [
    'You are the JEDDSpace AI Assistant.',
    'Summarize the following document content in clear, concise bullet points.',
    'Focus on key information, policies, rules, or important details.',
    '',
    `Document: ${document.title || document.file_name}`,
    '',
    'Content:',
    extractedText.slice(0, 8000),
    '',
    'Provide a summary in bullet point format:',
  ].join('\n')

  const summary = await groqClient.chat([
    { role: 'system', content: 'You are a document summarization assistant. Provide concise bullet-point summaries of document content.' },
    { role: 'user', content: prompt },
  ])

  await saveSummary({
    referenceType: `document_${documentId}`,
    contentSummary: summary,
    rawDataSnapshot: `Document: ${document.title || document.file_name}\n\n${extractedText.slice(0, 5000)}`,
  })

  return {
    data: {
      summary,
      cached: false,
    },
  }
}

export const handleDocumentExtract = async ({ viewer, payload = {} }) => {
  const { documentId } = payload

  if (!documentId) {
    return { status: 400, error: 'Document ID is required' }
  }

  const { client, document } = await loadAuthorizedDocument({ viewer, documentId })
  const extracted = await extractDocumentContent({ client, document, useCache: true })

  return {
    data: {
      document,
      content: extracted.content,
      cached: extracted.cached,
    },
  }
}
