import React from 'react'

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14
}

const variants = {
  primary: { backgroundColor: '#2563eb', color: '#fff' },
  outline: { backgroundColor: 'transparent', color: '#2563eb', border: '1px solid #2563eb' },
  danger: { backgroundColor: '#dc2626', color: '#fff' },
  neutral: { backgroundColor: '#e5e7eb', color: '#111' }
}

export default function Button({ variant = 'primary', children, onClick, disabled, style, type = 'button', ...props }) {
  const v = variants[variant] || variants.primary
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...v, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : undefined, ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
