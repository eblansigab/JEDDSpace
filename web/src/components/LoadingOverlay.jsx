import React from 'react'
const LoadingOverlay = ({ visible, message, text }) => {
  if (!visible) return null
  const displayText = message || text || 'Loading...'
  return (
    <div className="loading-overlay" aria-live="assertive" role="alert">
      <div className="loading-box">
        <div className="spinner"></div>
        <p className="loading-text">{displayText}</p>
      </div>
    </div>
  )
}
export default LoadingOverlay