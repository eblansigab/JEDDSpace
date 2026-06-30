import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

const typingDot = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#64748b'
}

export default function ChatWindow({ messages = [], isLoading = false, loadingLabel = 'Thinking...' }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  return (
    <div className="chat-window-bg"
      style={{
        background: '#fff',
        border: '1px solid #dbe3ef',
        borderRadius: 8,
        padding: 16,
        minHeight: 300,
        maxHeight: '55vh',
        overflowY: 'auto',
        display: 'grid',
        gap: 10
      }}
    >
      {messages.length === 0 ? (
        <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#475569', textAlign: 'center', padding: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1E0977' }}>Start a conversation</div>
            <div style={{ maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Ask about employees, jobs, leave requests, contracts, notifications, or ask for a summary.
            </div>
          </div>
        </div>
      ) : (
        messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} message={message} />)
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #dbe3ef', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>JEDDSpace AI</div>
            <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>{loadingLabel}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={typingDot} />
              <span style={{ ...typingDot, opacity: 0.7 }} />
              <span style={{ ...typingDot, opacity: 0.5 }} />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
