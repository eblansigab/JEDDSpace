
const AUDIENCE_OPTIONS = [
  { value: 'BOTH', label: 'Both', icon: '👥', description: 'All employees' },
  { value: 'ADMINISTRATION', label: 'Administration', icon: '🏢', description: 'Admin department only' },
  { value: 'ENGINEERING', label: 'Engineering', icon: '⚙️', description: 'Engineering department only' },
]

const AudienceSelector = ({ value, onChange, disabled = false }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12
    }}>
      {AUDIENCE_OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <label
            key={option.value}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              borderRadius: 12,
              border: `1.5px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              boxShadow: isSelected
                ? '0 4px 12px rgba(37, 99, 235, 0.12)'
                : '0 1px 3px rgba(15, 23, 42, 0.04)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
          >
            <input
              type="radio"
              name="audience"
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              fontSize: 28,
              lineHeight: 1,
              filter: isSelected ? 'none' : 'grayscale(0.2)',
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.2s ease'
            }}>
              {option.icon}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: isSelected ? '#1e40af' : '#1f2937',
              textAlign: 'center',
              lineHeight: 1.3
            }}>
              {option.label}
            </span>
            <span style={{
              fontSize: 11,
              color: isSelected ? '#3b82f6' : '#6b7280',
              textAlign: 'center',
              lineHeight: 1.3
            }}>
              {option.description}
            </span>
            {isSelected && (
              <span style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1
              }}>
                ✓
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}

export const mapAudienceToVisibility = (audience) => {
  switch (audience) {
    case 'ADMINISTRATION':
      return { scope: 'DEPARTMENT', target: 'Administration' }
    case 'ENGINEERING':
      return { scope: 'DEPARTMENT', target: 'Engineering' }
    case 'BOTH':
    default:
      return { scope: 'ORGANIZATION', target: null }
  }
}

export const getAudienceBadge = (audience) => {
  switch (audience) {
    case 'ADMINISTRATION':
      return 'Administration'
    case 'ENGINEERING':
      return 'Engineering'
    case 'BOTH':
    default:
      return 'Both'
  }
}

export const getAudienceFromVisibility = (visibilityScope, visibilityTarget) => {
  const scope = String(visibilityScope || '').trim().toUpperCase()
  if (scope === 'DEPARTMENT') {
    const target = String(visibilityTarget || '').trim()
    if (target.toLowerCase() === 'administration') return 'ADMINISTRATION'
    if (target.toLowerCase() === 'engineering') return 'ENGINEERING'
  }
  return 'BOTH'
}

export default AudienceSelector
export { AUDIENCE_OPTIONS }
