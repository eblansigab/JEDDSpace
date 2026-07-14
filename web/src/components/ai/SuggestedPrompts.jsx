import Button from '../Button'

export default function SuggestedPrompts({ prompts = [], onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {prompts.map((prompt) => (
        <Button
          className='suggested-prompt'
          key={prompt.label}
          variant="outline"
          onClick={() => onSelect(prompt)}
          title={prompt.label}
          style={{
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: 32,
            padding: '6px 12px',
            borderColor: '#cbd5e1',
            color: '#0f172a',
            background: '#fff',
            fontSize: 12,
            lineHeight: 1.3,
            borderRadius: 999,
          }}
        >
          {prompt.label}
        </Button>
      ))}
    </div>
  )
}
