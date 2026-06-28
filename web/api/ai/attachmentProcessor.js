const MAX_ATTACHMENT_CHARS = 5000

const extractTextFromPdf = async (fileUrl) => {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) return ''
    const buffer = await response.arrayBuffer()
    const signature = new TextDecoder('latin1').decode(new Uint8Array(buffer).slice(0, 16))
    if (signature.includes('%PDF')) {
      return '[PDF document uploaded. Text extraction is not available in the current runtime.]'
    }
    return ''
  } catch {
    return ''
  }
}

const extractTextFromImage = async (fileUrl, fileType) => {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) return ''
    return `[Image file uploaded: ${fileType || 'unknown type'}. Vision analysis is not available in the current Groq text request.]`
  } catch {
    return ''
  }
}

const extractTextFromAudio = async (fileUrl, fileType) => {
  return `[Audio file uploaded: ${fileType || 'unknown type'}. Transcription is not available in the current Groq text request.]`
}

export const processAttachment = async (fileUrl, fileType) => {
  const lowerType = (fileType || '').toLowerCase()

  if (lowerType === 'application/pdf') {
    return { content: await extractTextFromPdf(fileUrl), type: 'document' }
  }

  if (lowerType === 'text/plain' || lowerType === 'text/csv') {
    const response = await fetch(fileUrl)
    const text = response.ok ? await response.text() : ''
    return { content: text.slice(0, MAX_ATTACHMENT_CHARS), type: 'document' }
  }

  if (lowerType.includes('image/')) {
    return { content: await extractTextFromImage(fileUrl, fileType), type: 'image' }
  }

  if (lowerType === 'audio/mpeg' || lowerType === 'audio/wav' || lowerType === 'audio/mp4' || lowerType === 'audio/x-m4a') {
    return { content: await extractTextFromAudio(fileUrl, fileType), type: 'audio' }
  }

  if (lowerType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { content: `[DOCX document - content extraction needed]`, type: 'document' }
  }

  if (lowerType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return { content: `[XLSX spreadsheet - content extraction needed]`, type: 'document' }
  }

  return { content: `[Unsupported file type: ${fileType}]`, type: 'unknown' }
}

export const processAttachments = async (files) => {
  const results = await Promise.all(
    (files || []).map(async (file) => {
      const { file_path, file_type, title, file_name } = file
      const result = await processAttachment(file_path, file_type, title || file_name)
      return {
        ...file,
        extractedContent: result.content,
        attachmentType: result.type
      }
    })
  )
  return results
}
