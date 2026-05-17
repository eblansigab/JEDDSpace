import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const AuditBlockchainPage = () => {
const [isHrOpen, setIsHrOpen] = useState(false)

useEffect(() => {
const handleOutsideClick = (event) => {
if (!event.target.matches('.drop-btn')) {
setIsHrOpen(false)
}
}
window.addEventListener('click', handleOutsideClick)
return () => window.removeEventListener('click', handleOutsideClick)
}, [])

const records = [
{ id: '001', hash: '0xA12B34C56D78E90F...', time: '2026-04-20 14:32', status: 'completed', label: 'Verified' },
{ id: '002', hash: '0xF98E76D54C32B10A...', time: '2026-04-21 09:15', status: 'ongoing', label: 'Pending' },
{ id: '003', hash: '0xB45C67E89F01A23D...', time: '2026-04-22 18:47', status: 'cancelled', label: 'Flagged' }
]

return (
<div>   
  <header>
          <a href="/dashboard">
            <img
              className="max-w-3xs"
              src={logo}
              alt="JEDDSpace Logo"
              style={{ width: '220px' }}
            />
          </a>
        </header>
  <div className="layout">
    <nav className="sidebar">
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/documents">Documents</a></li>
        <li><a href="/emails">Email</a></li>
        <li><a href="/contracts">Contracts</a></li>
        <li><a href="/announcements">Announcements</a></li>
        <li>
          <button 
            className="drop-btn" 
            onClick={(e) => {
              e.stopPropagation()
              setIsHrOpen(!isHrOpen)
            }}
          >
            HR Forms {isHrOpen ? '▲' : '▼'}
          </button>
          <ul className={`dropdown ${isHrOpen ? '' : 'hidden'}`}>
            <li><a href="/official-business">Official Business Form</a></li>
            <li><a href="/leave-form">Leave Form</a></li>
          </ul>
        </li>
        <li><a href="/admin-dashboard">Admin Dashboard</a></li>
      </ul>
    </nav>

    <main className="content">
      <h1>Audit Blockchain Records</h1>

      <div className="record-controls">
        <input type="text" placeholder="Search records by ID or hash..." />
        <button className="primary-btn">Search</button>
      </div>

      <section className="record-table">
        <table>
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Transaction Hash</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
                <td>{record.hash}</td>
                <td>{record.time}</td>
                <td>
                  <span className={`status ${record.status}`}></span> 
                  {record.label}
                </td>
                <td>
                  <button className="view-btn">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  </div>
</div>
)
}

export default AuditBlockchainPage;