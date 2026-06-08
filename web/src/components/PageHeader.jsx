import React from 'react'

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-info">
        <div className="page-header-title">{title}</div>
        {subtitle && <div className="page-header-subtitle">{subtitle}</div>}
      </div>
      {actions && (
        <div className="page-header-actions">
          {actions.map((a, i) => (
            <span key={i} className="page-header-action-item">{a}</span>
          ))}
        </div>
      )}
    </div>
  )
}
