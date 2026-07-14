import React, { useMemo } from 'react'

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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
  },
  tableHeaderCell: {
    background: '#f1f5f9',
    color: '#0f172a',
    fontWeight: 600,
    textAlign: 'left',
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
  },
  tableCell: {
    padding: '7px 10px',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  },
  tableRowEven: {
    background: '#f8fafc',
  },
}

const parseMarkdownTable = (text) => {
  const lines = text.split('\n')
  const tableLines = []
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      tableLines.push(trimmed)
    } else if (inTable) {
      break
    }
  }

  if (tableLines.length < 2) return null

  const parseRow = (row) => {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim())
    return cells
  }

  const headers = parseRow(tableLines[0])
  const separator = tableLines[1]
  const isSeparator = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(separator)

  if (!isSeparator) return null

  const rows = tableLines.slice(2).map((line) => parseRow(line))

  return { headers, rows }
}

const renderMarkdownTable = (table) => {
  const { headers, rows } = table
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index} style={styles.tableHeaderCell}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} style={rowIndex % 2 === 0 ? styles.tableRowEven : undefined}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} style={styles.tableCell}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const renderContent = (content) => {
  const lines = content.split('\n')
  const parts = []
  let currentTableLines = []
  let inTable = false

  const flushTable = () => {
    if (!currentTableLines.length) return
    const table = parseMarkdownTable(currentTableLines.join('\n'))
    if (table) {
      parts.push(renderMarkdownTable(table))
    } else {
      parts.push(currentTableLines.join('\n'))
    }
    currentTableLines = []
    inTable = false
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      currentTableLines.push(line)
    } else if (inTable) {
      flushTable()
      parts.push(line)
    } else {
      parts.push(line)
    }
  }

  flushTable()

  return parts.map((part, index) => {
    if (React.isValidElement(part)) {
      return <span key={index}>{part}</span>
    }
    return <span key={index}>{part}</span>
  })
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const content = useMemo(() => renderContent(message.content), [message.content])
  return (
    <div style={{ ...styles.wrapper, ...(isUser ? styles.userWrapper : null) }}>
      <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.assistantBubble) }}>
        <span style={styles.label}>{isUser ? 'You' : 'JEDDSpace AI'}</span>
        {isUser ? message.content : content}
      </div>
    </div>
  )
}
