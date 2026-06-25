import { useMemo, useState } from 'react'
import { Button, PageHeader } from '../components'
import ChatWindow from '../components/ai/ChatWindow'
import ChatInput from '../components/ai/ChatInput'
import SuggestedPrompts from '../components/ai/SuggestedPrompts'
import DashboardLayout from '../layouts/dashboardLayout'
import { useAuth } from '../services/authContext'
import { aiService } from '../services/aiservice'

const welcomeMessage = {
  role: 'assistant',
  content:
    'I can answer questions about employees, jobs, leave requests, contracts, notifications, and recommendations. Try one of the suggestions or ask a custom question.',
}

export default function AiAssistantPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const quickPrompts = useMemo(
    () => [
      {
        label: "Today's Jobs",
        description: 'Summarize the current job assignments for management.',
        message: "Summarize today's jobs.",
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
        description: 'Ask why a worker was recommended.',
        message: 'Explain why the recommended worker was selected for this assignment window.',
      },
    ],
    []
  )

  const appendMessage = (role, content) => {
    setMessages((current) => [...current, { role, content }])
  }

  const runPrompt = async (rawPrompt) => {
    const trimmed = String(rawPrompt || '').trim()
    if (!trimmed || loading) return

    setLoading(true)
    setPrompt('')
    appendMessage('user', trimmed)

    try {
      const reply = await aiService.chat(trimmed)
      appendMessage('assistant', reply || 'I could not generate a response.')
    } catch (error) {
      console.error('[AiAssistantPage] AI request failed:', error)
      appendMessage('assistant', 'AI service is currently unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestedPrompt = async (item) => {
    await runPrompt(item.message)
  }

  const handleClearChat = () => {
    setMessages([welcomeMessage])
    setPrompt('')
  }

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="AI Assistant"
          subtitle={`JEDDSpace AI is ready${profile?.first_name ? `, ${profile.first_name}` : ''}. Ask about jobs, employees, leave, contracts, or notifications.`}
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

              <div className="ai-assistant-note">
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
              <ChatWindow messages={messages} isLoading={loading} />

              <ChatInput
                value={prompt}
                onChange={setPrompt}
                onSend={() => runPrompt(prompt)}
                loading={loading}
                placeholder="Ask about employees, jobs, leave, contracts, notifications, or recommendations..."
              />
            </div>
          </section>
        </section>
      </main>
    </DashboardLayout>
  )
}