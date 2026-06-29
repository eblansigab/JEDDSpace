const DOCUMENT_SELECT = `
  document_id,
  title,
  file_name,
  file_type,
  file_size,
  file_path,
  uploaded_by,
  created_at,
  ai_summary
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
    }
  }

  const directMatch = findByMessage(documents, message)
  if (directMatch) {
    return {
      document: directMatch,
      reason: 'message_match',
    }
  }

  if (['it', 'that', 'this', 'tell me more', 'summarize it', 'explain it'].some((phrase) => text.includes(phrase))) {
    const conversationMatch = findMentionedDocument(documents, messages)
    if (conversationMatch) {
      return {
        document: conversationMatch,
        reason: 'conversation_reference',
      }
    }
  }

  return null
}
