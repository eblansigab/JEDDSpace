import Button from '../Button'

export default function ChatInput({ value, onChange, onSend, loading = false, placeholder }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        border: '1px solid #dbe3ef',
        background: '#fff'
      }}
    >
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%',
          resize: 'vertical',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          padding: 14,
          fontSize: 15,
          lineHeight: 1.5,
          outline: 'none'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          Press Enter to send, Shift+Enter for a new line.
        </div>
        <Button onClick={onSend} disabled={loading || !String(value || '').trim()}>
          {loading ? 'Thinking...' : 'Send Message'}
        </Button>
      </div>
    </div>
  )
}
