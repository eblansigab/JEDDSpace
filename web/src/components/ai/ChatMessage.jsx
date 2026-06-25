const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: 'min(780px, 90%)',
    padding: '12px 14px',
    borderRadius: 16,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  },
  userBubble: {
    background: '#1E0977',
    color: '#ffffff',
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #dbe3ef',
    borderTopLeftRadius: 4,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
    opacity: 0.75,
  },
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div style={{ ...styles.wrapper, ...(isUser ? styles.userWrapper : null) }}>
      <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.assistantBubble) }}>
        <span style={styles.label}>{isUser ? 'You' : 'JEDDSpace AI'}</span>
        {message.content}
      </div>
    </div>
  )
}
