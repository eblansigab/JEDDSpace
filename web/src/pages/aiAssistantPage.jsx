import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, PageHeader } from '../components'
import ChatWindow from '../components/ai/ChatWindow'
import ChatInput from '../components/ai/ChatInput'
import SuggestedPrompts from '../components/ai/SuggestedPrompts'
import DashboardLayout from '../layouts/dashboardLayout'
import { useAuth } from '../services/authContext'
import { aiService } from '../services/aiservice'
import { getRecommendations } from '../services/recommendationService'

const welcomeMessage = {
  role: 'assistant',
  content:
    'I can answer questions about employees, jobs, leave requests, projects, notifications, documents, and recommendations. You can also upload PDF, TXT, CSV, DOCX, XLSX, PNG, JPG, WEBP, MP3, WAV, or M4A files for analysis.',
}

const SESSION_STORAGE_KEY = 'jeddspace_ai_session_id'
const SESSION_LIST_STORAGE_KEY = 'jeddspace_ai_sessions'

const createSessionId = () => `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const logAssistantError = (label, error, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    label,
    message: error?.message ?? String(error),
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    code: error?.code ?? null,
    stack: error?.stack ?? null,
    error,
    ...meta,
  }
  console.error('[AiAssistantPage]', JSON.stringify(entry))
}

const logSaveCall = (saveCallCountRef, lastSaveTimestampRef, sessionId, messageCount, payloadSize) => {
  const now = new Date().toISOString()
  saveCallCountRef.current += 1
  lastSaveTimestampRef.current = now
  console.log('[HistorySave]', JSON.stringify({
    timestamp: now,
    sessionId,
    messageCount,
    payloadSize,
    callCount: saveCallCountRef.current,
  }))
}

const getStoredSessionId = () => {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing
  const created = createSessionId()
  localStorage.setItem(SESSION_STORAGE_KEY, created)
  return created
}

const getStoredSessions = () => {
  try {
    const sessions = JSON.parse(localStorage.getItem(SESSION_LIST_STORAGE_KEY) || '[]')
    return Array.isArray(sessions) && sessions.length ? sessions : [getStoredSessionId()]
  } catch {
    return [getStoredSessionId()]
  }
}

export default function AiAssistantPage() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [messages, setMessages] = useState([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [attachments, setAttachments] = useState([])
  const [sessionId, setSessionId] = useState(() => getStoredSessionId())
  const [sessions, setSessions] = useState(() => getStoredSessions())
  const saveCallCountRef = useRef(0)
  const lastSaveTimestampRef = useRef(null)

  useEffect(() => {
    const loadHistory = async () => {
      if (user?.id) {
        try {
          const history = await aiService.loadChatHistory(user.id, sessionId)
          if (history && history.length > 0) {
            setMessages(history)
          }
        } catch {
          // ignore - use default welcome message
        }
      }
    }
    loadHistory()
  }, [user?.id, sessionId])

  useEffect(() => {
    if (location.state?.prefilledPrompt) {
      const timer = setTimeout(() => setPrompt(location.state.prefilledPrompt), 0)
      return () => clearTimeout(timer)
    }
  }, [location.state?.prefilledPrompt])

  const quickPrompts = useMemo(
    () => [
      {
        label: "Today's Jobs",
        description: 'Summarize the current job assignments for management.',
        message: "Summarize today's jobs.",
      },
      {
        label: "Operations Summary",
        description: 'How are operations today?',
        message: 'How are operations today?',
      },
      {
        label: 'Available Workers',
        description: 'Show who can be assigned without conflicts.',
        message: 'Who is available tomorrow and why?',
      },
      {
        label: 'Employees on Leave',
        description: 'Review current approved leave requests.',
        message: 'Show the employees on approved leave and summarize the leave details.',
      },
      {
        label: 'Project Summary',
        description: 'Summarize the active project list.',
        message: 'Summarize the current projects.',
      },
      {
        label: 'Unread Notifications',
        description: 'Summarize unread alerts and announcements.',
        message: 'Summarize unread notifications.',
      },
      {
        label: 'Recommendation Explanation',
        description: 'Explain why workers were recommended for tomorrow.',
        message: 'Explain why the recommended worker was selected for this assignment window.',
      },
      {
        label: 'Previous Summaries',
        description: 'View previous AI-generated summaries.',
        message: 'Show previous AI summaries.',
      },
      {
        label: 'Document Summary',
        description: 'Summarize uploaded documents.',
        message: 'List the uploaded documents.',
      },
     
      {
        label: 'Compare projects',
        description: 'Compare uploaded projects with database.',
        message: 'Check for conflicts between an uploaded project and our existing projects.',
      },
    ],
    []
  )

  const appendMessage = (role, content) => {
    setMessages((current) => {
      const updated = [...current, { role, content }]
      if (user?.id) {
        const payload = JSON.stringify(updated)
        logSaveCall(saveCallCountRef, lastSaveTimestampRef, sessionId, updated.length, payload.length)
        aiService.saveChatHistory(user.id, updated, sessionId).catch((error) => {
          logAssistantError('Save chat history failed in appendMessage', error, {
            sessionId,
            messageCount: updated.length,
            payloadSize: payload.length,
          })
        })
      }
      return updated
    })
  }

   const runPrompt = async (rawPrompt, attachContext = false, attachmentsOverride) => {
     const trimmed = String(rawPrompt || '').trim()
     if (!trimmed || loading) return
 
     setLoading(true)
     setLoadingStatus(attachContext || /document|file|upload|screenshot|pdf|image|handbook/i.test(trimmed)
       ? 'Retrieving document...'
       : 'Thinking...')
     setPrompt('')
     const userMessage = { role: 'user', content: trimmed }
     let statusTimer = null
 
     try {
       const historyMessages = messages.map((m) => ({ role: m.role, content: m.content }))
       const allMessages = [...historyMessages, userMessage]
       setMessages((current) => [...current, userMessage])
 
       statusTimer = setTimeout(() => {
         setLoadingStatus(attachContext || /document|file|upload|screenshot|pdf|image|handbook/i.test(trimmed)
           ? 'Reading document...'
           : 'Generating response...')
       }, 900)
 
       const assistantMessage = { role: 'assistant', content: '' }
       setMessages((current) => [...current, assistantMessage])
 
       const result = await aiService.chatWithContextStream(allMessages, user?.id, attachContext ? (attachmentsOverride || attachments) : [], {
         sessionId,
         onProgress: (message) => setLoadingStatus(message),
         onToken: (_token, fullText) => {
           setMessages((current) => {
             const updated = [...current]
             updated[updated.length - 1] = { role: 'assistant', content: fullText }
             return updated
           })
         }
       })
 
       const reply = result.response || 'I could not generate a response.'
       setMessages((current) => {
         const updated = [...current]
         updated[updated.length - 1] = { role: 'assistant', content: reply }
         return updated
       })
       if (user?.id) {
         const updated = [...allMessages, { role: 'assistant', content: reply || '' }]
         const payload = JSON.stringify(updated)
         logSaveCall(saveCallCountRef, lastSaveTimestampRef, sessionId, updated.length, payload.length)
         aiService.saveChatHistory(user.id, updated, sessionId).catch((error) => {
           logAssistantError('Save chat history failed after runPrompt', error, {
             sessionId,
             messageCount: updated.length,
             payloadSize: payload.length,
           })
         })
       }
     } catch (error) {
       logAssistantError('AI request failed', error, {
         sessionId,
         messageCount: messages.length,
         prompt: trimmed,
       })
       setMessages((current) => [...current, { role: 'assistant', content: 'AI service is currently unavailable.' }])
     } finally {
       if (statusTimer) clearTimeout(statusTimer)
       setLoading(false)
       setLoadingStatus('')
     }
   }

   /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (location.state?.document) {
      const doc = location.state.document
      const attachment = {
        document_id: doc.document_id || doc.id,
        id: doc.id,
        title: doc.title || doc.file_name || doc.name,
        file_name: doc.file_name || doc.name,
        file_path: doc.file_path || doc.file_url,
        file_type: doc.file_type,
        file_size: doc.file_size || doc.size
      }
      const timer1 = setTimeout(() => setAttachments([attachment]), 0)
      if (location.state?.prefilledPrompt) {
        const timer2 = setTimeout(() => setPrompt(location.state.prefilledPrompt), 0)
        const timer3 = setTimeout(() => runPrompt(location.state.prefilledPrompt, true, [attachment]), 0)
        return () => {
          clearTimeout(timer1)
          clearTimeout(timer2)
          clearTimeout(timer3)
        }
      }
      return () => clearTimeout(timer1)
    }
  }, [location.state?.document, location.state?.prefilledPrompt])
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleSuggestedPrompt = async (item) => {
    if (item.label === 'Recommendation Explanation') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      try {
        const recommendations = await getRecommendations({
          startDate: tomorrowStr,
          endDate: tomorrowStr
        })

        const snapshot = recommendations.length > 0
          ? recommendations.map(r => `${r.full_name} | Score: ${r.score} | Reasons: ${r.reasons?.join(', ') || 'None'}`).join('\n')
          : 'No recommendations available for tomorrow.'

        const dynamicPrompt = [
          'You are the AI assistant for JEDDSpace.',
          'Explain why each recommended worker was selected based on the recommendation scores and reasons.',
          '',
          'Recommendations for tomorrow:',
          snapshot,
          '',
          'Question: Provide a concise explanation for why these workers were recommended.'
        ].join('\n')

        setLoading(true)
        setLoadingStatus('Generating response...')
        setPrompt('')
        appendMessage('user', item.message)

        const historyMessages = messages.map((m) => ({ role: m.role, content: m.content }))
        const reply = await aiService.chatWithContext([...historyMessages, { role: 'user', content: dynamicPrompt }])
        appendMessage('assistant', reply || 'I could not generate a response.')
        setLoading(false)
        setLoadingStatus('')
      } catch (error) {
        logAssistantError('Recommendation error', error, {
          sessionId,
          messageCount: messages.length,
        })
        appendMessage('assistant', 'Unable to fetch recommendations at this time.')
        setLoading(false)
        setLoadingStatus('')
      }
      return
    }

    await runPrompt(item.message)
  }

  const handleClearChat = () => {
    const cleared = [welcomeMessage]
    setMessages(cleared)
    setPrompt('')
    setAttachments([])
    if (user?.id) {
      const payload = JSON.stringify(cleared)
      logSaveCall(saveCallCountRef, lastSaveTimestampRef, sessionId, cleared.length, payload.length)
      aiService.saveChatHistory(user.id, cleared, sessionId).catch((error) => {
        logAssistantError('Save chat history failed in handleClearChat', error, {
          sessionId,
          messageCount: cleared.length,
          payloadSize: payload.length,
        })
      })
    }
  }

  const handleNewChat = () => {
    const nextSessionId = createSessionId()
    localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId)
    const nextSessions = [nextSessionId, ...sessions.filter((item) => item !== nextSessionId)].slice(0, 8)
    localStorage.setItem(SESSION_LIST_STORAGE_KEY, JSON.stringify(nextSessions))
    setSessions(nextSessions)
    setSessionId(nextSessionId)
    setMessages([welcomeMessage])
    setPrompt('')
    setAttachments([])
  }

  const handleSwitchSession = (nextSessionId) => {
    localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId)
    setSessionId(nextSessionId)
    setMessages([welcomeMessage])
    setPrompt('')
    setAttachments([])
  }

  const handleAddAttachment = async (file) => {
    try {
      const uploaded = await aiService.uploadAttachment(file)
      setAttachments((current) => [...current, uploaded])
    } catch (error) {
      logAssistantError('Upload failed', error, {
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
      })
    }
  }

  const handleRemoveAttachment = (docId) => {
    setAttachments((current) => current.filter((a) => a.document_id !== docId && a.id !== docId))
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="AI Assistant"
          subtitle={`Ask about jobs, employees, leave, projects, notifications, documents, or upload files for analysis.`}
          actions={[
            <select
              key="ai-session-select"
              value={sessionId}
              onChange={(event) => handleSwitchSession(event.target.value)}
              disabled={loading}
              title="Switch chat session"
              style={{ minHeight: 38, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px' }}
            >
              {sessions.map((item, index) => (
                <option key={item} value={item}>
                  {index === 0 ? 'Current Chat' : `Chat ${index + 1}`}
                </option>
              ))}
            </select>,
            <Button key="clear-ai-chat" variant="outline" onClick={handleClearChat} disabled={loading} title="Clear chat">
              Clear Chat
            </Button>,
            <Button key="new-ai-chat" variant="outline" onClick={handleNewChat} disabled={loading} title="Start new AI chat">
              New Chat
            </Button>,
          ]}
        />

        <section className="dashboard-grid ai-assistant-grid">
          <aside className="dashboard-widget ai-assistant-sidebar-panel">
            <div className="dashboard-widget-header">
              <div>
                <h3>Suggested Prompts</h3>
                <span>Quick actions grounded in JEDDSpace data.</span>
              </div>
            </div>

            <div className="dashboard-widget-body">
              <SuggestedPrompts prompts={quickPrompts} onSelect={handleSuggestedPrompt} />

              <div className="ai-assistant-note" style={{ marginTop: 12 }}>
                Disclaimer: All prompts sent through this assistant will be stored within JEDD Technologies Corp. and will not be used to train other models.
              </div>
            </div>
          </aside>

          <section className="dashboard-widget ai-assistant-chat-panel">
            <div className="dashboard-widget-header">
              <div>
                <h3>Conversation</h3>
              </div>
            </div>

            <div className="dashboard-widget-body ai-assistant-chat-body">
              <ChatWindow messages={messages} isLoading={loading} loadingLabel={loadingStatus || 'Thinking...'} />

              <ChatInput
                value={prompt}
                onChange={setPrompt}
                onSend={() => runPrompt(prompt, true)}
                loading={loading}
                placeholder="Ask about employees, jobs, leave, projects, notifications, documents, or upload files for analysis..."
                attachments={attachments}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />
            </div>
          </section>
        </section>
      </main>
    </DashboardLayout>
  )
}
