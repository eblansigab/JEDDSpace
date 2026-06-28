import { getRequestUserContext, getSupabaseServerClient, saveSummary, getSummaryByType } from './ai/supabaseClient.js'
import { groqClient } from './ai/groqClient.js'

const extractTextFromFile = async (fileUrl, fileType) => {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) return null

    if (fileType === 'application/pdf') {
      const buffer = await response.arrayBuffer()
      const data = buffer.toString()
      if (data.includes('PDF')) {
        return `[PDF file - use the summarizeDocument endpoint to generate summary]`
      }
      return null
    }

    if (fileType === 'text/plain') {
      return await response.text()
    }

    if (fileType?.startsWith('image/')) {
      return `[Image file - OCR would be needed for text extraction]`
    }

    return null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentId } = req.body || {}

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' })
  }

  try {
    const viewer = await getRequestUserContext(req)
    if (!viewer?.user?.id) {
      return res.status(401).json({ error: 'Authentication is required' })
    }

    const client = getSupabaseServerClient()

    let documentQuery = client
      .from('document')
      .select('document_id, title, file_name, file_path, file_type')
      .eq('document_id', documentId)

    if (!viewer.isAdmin) {
      documentQuery = documentQuery.eq('uploaded_by', viewer.user.id)
    }

    const { data: document, error } = await documentQuery.single()

    if (error) throw error

    const cachedSummary = await getSummaryByType(`document_${documentId}`)
    if (cachedSummary?.content_summary) {
      return res.status(200).json({
        summary: cachedSummary.content_summary,
        cached: true
      })
    }

    const fileUrl = document.file_path
    let extractedText = await extractTextFromFile(fileUrl, document.file_type)

    if (!extractedText || extractedText.length < 50) {
      extractedText = `Document: ${document.title || document.file_name}. Content extraction not available for this file type. Summary will be generated based on filename when content is accessible.`
    }

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
      'Provide a summary in bullet point format:'
    ].join('\n')

    const summary = await groqClient.chat([
      { role: 'system', content: 'You are a document summarization assistant. Provide concise bullet-point summaries of document content.' },
      { role: 'user', content: prompt }
    ])

    await saveSummary({
      referenceType: `document_${documentId}`,
      contentSummary: summary,
      rawDataSnapshot: `Document: ${document.title || document.file_name}\n\n${extractedText.slice(0, 5000)}`
    })

    return res.status(200).json({
      summary,
      cached: false
    })
  } catch (error) {
    console.error('[summarizeDocument]', error)
    return res.status(500).json({ error: 'Unable to summarize document.' })
  }
}
