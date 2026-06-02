import React from 'react'
const StatusBadge = ({ status }) => {
  const getStatusClass = () => {
    const normalized = status?.toLowerCase() || ''

    switch (normalized) {
      case 'active':
      case 'ongoing':
      case 'online':
      case 'open':
      case 'in progress':
      case 'published':
      case 'normal':
        return 'status-active'
      case 'completed':
      case 'closed':
      case 'done':
      case 'low':
        return 'status-completed'
      case 'pending':
      case 'draft':
      case 'high':
        return 'status-pending'
      case 'cancelled':
      case 'inactive':
      case 'offline':
      case 'delayed':
      case 'problem':
      case 'failed':
      case 'archived':
      case 'critical':
      case 'suspended':
        return 'status-cancelled'
      default:
        return 'status-default'
    }
  }
  // Normalize status text for display (e.g., 'in progress' -> 'In progress')
  const formatStatus = (txt) => {
    if (!txt) return 'Unknown'
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  }
  return (
    <span className={`status-badge ${getStatusClass()}`}>
      <span className="status-dot"></span>
      {formatStatus(status)}
    </span>
  )
}
export default StatusBadge
