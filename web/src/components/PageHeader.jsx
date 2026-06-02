import React from 'react'

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ color: '#6b7280', fontSize: 13 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{actions && actions.map((a, i) => <span key={i}>{a}</span>)}</div>
    </div>
  )
}
