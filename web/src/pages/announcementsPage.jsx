import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const AnnouncementsPage = () => {
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

const announcementData = [
{
title: 'Office Closure on Thanksgiving',
date: '2023-11-01',
content: 'Please note that the office will be closed on Thanksgiving Day, November 23rd. Enjoy your holiday!'
},
{
title: 'Holiday Party Details',
date: '2023-11-15',
content: 'Join us for the annual holiday party on December 15th at 6 PM in the main conference room. Food and drinks will be provided!'
},
{
title: 'New Office Policies',
date: '2023-11-20',
content: 'Please review the updated office policies that will take effect starting January 1st, 2024. All employees are required to adhere to these policies.'
},
{
title: 'Team Building Event',
date: '2023-12-01',
content: 'A team building event will be held on December 10th. Please RSVP by December 5th to ensure your spot!'
},
{
title: 'New Health Benefits',
date: '2023-12-10',
content: 'We are excited to announce new health benefits that will be available to all employees starting January 2024. More details to follow.'
}
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
      <h1>Announcements</h1>

      <div className="search-bar">
        <input type="text" placeholder="Search announcements..." />
        <button className="primary-btn">Search</button>
      </div>

      {announcementData.map((item, index) => (
        <div key={index} className="announcement-box">
          <h3>{item.title}</h3>
          <p className="date">Published on: {item.date}</p>
          <p>{item.content}</p>
        </div>
      ))}
    </main>
  </div>
</div>
)
}

export default AnnouncementsPage;