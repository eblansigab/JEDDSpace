import React from 'react'
import LoadingOverlay from './LoadingOverlay'

const backdrop = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
}

const card = {
  background: '#fff',
  borderRadius: 8,
  padding: 18,
  width: 'min(720px, 96%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 6px 24px rgba(0,0,0,0.2)'
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12
}

export default function Modal({ visible, title, children, onClose, footer, loading = false }) {
  if (!visible) return null

  return (
    <div style={backdrop} role="dialog" aria-modal="true">
      <LoadingOverlay visible={loading} />
      <div style={card}>
        <div style={header}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20 }}
          >
            x
          </button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: 14 }}>{footer}</div>}
      </div>
    </div>
  )
}
