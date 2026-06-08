import React from 'react'

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-bar-container">
      <input
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className="search-bar-input"
      />
    </div>
  )
}
