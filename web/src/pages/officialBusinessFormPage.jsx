import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const OfficialBusinessFormPage = () => {
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
      <h1>Official Business Form</h1>

      <form className="business-form" onSubmit={(e) => e.preventDefault()}>
        <label className="block mb-1">Project</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Project Name" 
        />

        <label className="block mb-1">Duration</label>
        <div className="flex items-center gap-4 mb-4">
          <input type="date" className="border p-1 rounded" />
          <span>to</span>
          <input type="date" className="border p-1 rounded" />
        </div>

        <label className="block mb-1">Location</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Place, City, & Province" 
        />

        <label className="block mb-1">Company Car</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Car Name & License Plate" 
        />

        <label className="block mb-1">Driver</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Driver Name" 
        />

        <label className="block mb-1">Contact No.</label>
        <input 
          type="tel" 
          className="border p-2 rounded w-full mb-6" 
          placeholder="Enter Phone No." 
        />

        <button type="submit" className="primary-btn">
          Submit
        </button>
      </form>
    </main>
  </div>
</div>
)
}

export default OfficialBusinessFormPage;