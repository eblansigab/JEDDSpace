import { useEffect, useMemo, useState } from 'react'
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
    'I can answer questions about employees, jobs, leave requests, contracts, notifications, documents, and recommendations. You can also upload PDF, TXT, CSV, DOCX, XLSX, PNG, JPG, WEBP, MP3, WAV, or M4A files for analysis.',
}

export default function AiAssistantPage() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [messages, setMessages] = useState([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    const loadHistory = async () => {
      if (user?.id) {
        try {
          const history = await aiService.loadChatHistory(user.id)
          if (history && history.length > 0) {
            setMessages(history)
          }
        } catch {
          // ignore - use default welcome message
        }
      }
    }
    loadHistory()
  }, [user?.id])

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
        label: 'Contract Summary',
        description: 'Summarize the active contract list.',
        message: 'Summarize the current contracts.',
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
        label: 'Summarize Document',
        description: 'Explain a specific document.',
        message: 'Can you summarize the uploaded employee handbook?',
      },
      {
        label: 'Compare Contract',
        description: 'Compare uploaded contract with database.',
        message: 'Check for conflicts between an uploaded contract and our existing contracts.',
      },
      {
        label: 'Voice Transcript',
        description: 'Transcribe audio recording.',
        message: 'Transcribe this meeting recording.',
      },
    ],
    []
  )

  const appendMessage = (role, content) => {
    setMessages((current) => {
      const updated = [...current, { role, content }]
      if (user?.id) {
        aiService.saveChatHistory(user.id, updated).catch(() => {})
      }
      return updated
    })
  }

  const runPrompt = async (rawPrompt, attachContext = false) => {
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

      const reply = await aiService.chatWithContext(allMessages, user?.id, attachContext ? attachments : [])
      setLoadingStatus('Generating response...')
      setMessages((current) => [...current, { role: 'assistant', content: reply || 'I could not generate a response.' }])
      if (user?.id) {
        const updated = [...allMessages, { role: 'assistant', content: reply || '' }]
        aiService.saveChatHistory(user.id, updated).catch(() => {})
      }
    } catch (error) {
      console.error('[AiAssistantPage] AI request failed:', error)
      setMessages((current) => [...current, { role: 'assistant', content: 'AI service is currently unavailable.' }])
    } finally {
      if (statusTimer) clearTimeout(statusTimer)
      setLoading(false)
      setLoadingStatus('')
    }
  }

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
        console.error('[AiAssistantPage] Recommendation error:', error)
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
      aiService.saveChatHistory(user.id, cleared).catch(() => {})
    }
  }

  const handleAddAttachment = async (file) => {
    try {
      const uploaded = await aiService.uploadAttachment(file)
      setAttachments((current) => [...current, uploaded])
    } catch (error) {
      console.error('[AiAssistantPage] Upload failed:', error)
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
          subtitle={`JEDDSpace AI is ready${profile?.first_name ? `, ${profile.first_name}` : ''}. Ask about jobs, employees, leave, contracts, notifications, documents, or upload files for analysis.`}
          actions={[
            <Button key="clear-ai-chat" variant="outline" onClick={handleClearChat} disabled={loading} title="Clear chat">
              Clear Chat
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
                The assistant builds prompts from JEDDSpace data before calling Groq, so answers stay grounded in your records.
              </div>
            </div>
          </aside>

          <section className="dashboard-widget ai-assistant-chat-panel">
            <div className="dashboard-widget-header">
              <div>
                <h3>Conversation</h3>
                <span>Server-side AI runs through /api/chat and Groq.</span>
              </div>
            </div>

            <div className="dashboard-widget-body ai-assistant-chat-body">
              <ChatWindow messages={messages} isLoading={loading} loadingLabel={loadingStatus || 'Thinking...'} />

              <ChatInput
                value={prompt}
                onChange={setPrompt}
                onSend={() => runPrompt(prompt, true)}
                loading={loading}
                placeholder="Ask about employees, jobs, leave, contracts, notifications, documents, or upload files for analysis..."
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
