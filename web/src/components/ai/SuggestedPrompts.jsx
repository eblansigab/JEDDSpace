import Button from '../Button'

export default function SuggestedPrompts({ prompts = [], onSelect }) {
  return (
    <div  style={{ display: 'grid', gap: 10 }}>
      {prompts.map((prompt) => (
        <Button
          className='suggested-prompt'
          key={prompt.label}
          variant="outline"
          onClick={() => onSelect(prompt)}
          title={prompt.label}
          style={{
            justifyContent: 'flex-start',
            textAlign: 'left',
            minHeight: 46,
            padding: '10px 14px',
            borderColor: '#cbd5e1',
            color: '#0f172a',
            background: '#fff'
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{prompt.label}</div>
            {prompt.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{prompt.description}</div>}
          </div>
        </Button>
      ))}
    </div>
  )
}
