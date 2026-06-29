const DOCUMENT_SELECT = `
  document_id,
  title,
  file_name,
  file_type,
  file_size,
  file_path,
  uploaded_by,
  created_at,
  ai_summary,
  employee:uploaded_by (
    first_name,
    last_name,
    position
  )
`

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const viewerUserId = (viewer) => viewer?.employee?.user_id || viewer?.user?.id || null

const scopeDocumentQuery = (query, viewer) => {
  if (viewer?.isAdmin) return query
  const userId = viewerUserId(viewer)
  return userId ? query.eq('uploaded_by', userId) : query.limit(0)
}

const getDocumentLabel = (document) => {
  return [document.file_name, document.title].filter(Boolean).join(' ')
}

const containsDocumentKeyword = (message) => {
  const text = normalize(message)
  return [
    'document',
    'file',
    'upload',
    'uploaded',
    'latest',
    'screenshot',
    'image',
    'picture',
    'photo',
    'pdf',
    'docx',
    'xlsx',
    'csv',
    'txt',
    'handbook',
    'contract',
    'tell me more',
    'summarize it',
    'explain it',
    'that',
    'this',
  ].some((keyword) => text.includes(keyword))
}

const findMentionedDocument = (documents, messages = []) => {
  const recentText = normalize(
    messages
      .slice(-10)
      .map((message) => message?.content)
      .filter(Boolean)
      .join('\n')
  )

  if (!recentText) return null

  return documents.find((document) => {
    const fileName = normalize(document.file_name)
    const title = normalize(document.title)
    return (fileName && recentText.includes(fileName)) || (title && recentText.includes(title))
  }) || null
}

const findByMessage = (documents, message) => {
  const text = normalize(message)

  const exact = documents.find((document) => {
    const fileName = normalize(document.file_name)
    const title = normalize(document.title)
    return (fileName && text.includes(fileName)) || (title && text.includes(title))
  })

  if (exact) return exact

  const partial = documents.find((document) => {
    const label = normalize(getDocumentLabel(document))
    if (!label) return false

    return label
      .split(/[\s._-]+/)
      .filter((part) => part.length >= 4)
      .some((part) => text.includes(part))
  })

  if (partial) return partial

  if (text.includes('screenshot') || text.includes('image') || text.includes('photo') || text.includes('picture')) {
    return documents.find((document) => {
      const label = normalize(getDocumentLabel(document))
      const type = normalize(document.file_type)
      return label.includes('screenshot') || type.startsWith('image/')
    }) || null
  }

  if (text.includes('pdf')) {
    return documents.find((document) => normalize(document.file_type) === 'application/pdf' || normalize(document.file_name).endsWith('.pdf')) || null
  }

  return null
}

const getSearchTerms = (message) => {
  const stopWords = new Set([
    'the',
    'that',
    'this',
    'document',
    'file',
    'find',
    'show',
    'summarize',
    'explain',
    'about',
    'discussing',
    'discusses',
    'related',
    'uploaded',
    'latest',
  ])

  return normalize(message)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .slice(0, 5)
}

const searchDocumentCache = async ({ client, documents, message }) => {
  const terms = getSearchTerms(message)
  if (!terms.length) return null

  let query = client
    .from('ai_summarization')
    .select('reference_type, content_summary')
    .like('reference_type', 'document_text_v2_%')
    .limit(10)

  terms.slice(0, 2).forEach((term) => {
    query = query.ilike('content_summary', `%${term}%`)
  })

  const { data, error } = await query
  if (error || !data?.length) return null

  const allowedIds = new Set((documents || []).map((document) => Number(document.document_id)))
  const match = data.find((row) => {
    const documentId = Number(String(row.reference_type || '').replace('document_text_v2_', ''))
    return allowedIds.has(documentId)
  })

  if (!match) return null

  const documentId = Number(String(match.reference_type || '').replace('document_text_v2_', ''))
  const document = documents.find((item) => Number(item.document_id) === documentId)

  return document
    ? {
        document,
        reason: 'cached_content_search',
        confidence: 0.82,
      }
    : null
}

export const loadResolvableDocuments = async ({ client, viewer, limit = 50 }) => {
  const query = client
    .from('document')
    .select(DOCUMENT_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await scopeDocumentQuery(query, viewer)
  if (error) throw error
  return data || []
}

export const resolveDocumentReference = async ({ client, viewer, message, messages = [], attachments = [] }) => {
  const attachmentDocument = (attachments || []).find((item) => item?.document_id)
  if (attachmentDocument) {
    return {
      document: attachmentDocument,
      reason: 'attached_file',
      confidence: 1,
    }
  }

  if (!containsDocumentKeyword(message)) {
    return null
  }

  const documents = await loadResolvableDocuments({ client, viewer })
  if (!documents.length) return null

  const text = normalize(message)
  const latestRequested = text.includes('latest') || text.includes('recent') || text.includes('last uploaded')

  if (latestRequested) {
    return {
      document: documents[0],
      reason: 'latest_document',
      confidence: 0.92,
    }
  }

  const directMatch = findByMessage(documents, message)
  if (directMatch) {
    return {
      document: directMatch,
      reason: 'message_match',
      confidence: 0.96,
    }
  }

  const contentMatch = await searchDocumentCache({ client, documents, message })
  if (contentMatch) return contentMatch

  if (['it', 'that', 'this', 'tell me more', 'summarize it', 'explain it'].some((phrase) => text.includes(phrase))) {
    const conversationMatch = findMentionedDocument(documents, messages)
    if (conversationMatch) {
      return {
        document: conversationMatch,
        reason: 'conversation_reference',
        confidence: 0.78,
      }
    }
  }

  return null
}
