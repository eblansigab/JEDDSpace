import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const GeneralAnnouncement = () => {
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
      <section className="dashboard-widget p-6 bg-white border rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-2">General Announcement</h3>
        <p className="text-gray-700">
          This is how a company-wide general announcement looks like.
        </p>
      </section>
    </main>
  </div>
</div>
)
}

export default GeneralAnnouncement