import React from 'react'

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 200 }}
      />
    </div>
  )
}
