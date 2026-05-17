import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const LeaveFormPage = () => {
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
      <h1>Leave Form</h1>

      <form className="leave-form" onSubmit={(e) => e.preventDefault()}>
        <label>Duration</label>
        <div className="flex-initial gap-4">
          <input type="date" className="border p-1 rounded" /> 
          <span className="mx-2">to</span>
          <input type="date" className="border p-1 rounded" />
        </div>

        <label className="block mt-4">Type of Leave</label>
        <select className="border p-2 rounded w-full">
          <option value="VL">Vacation Leave (VL)</option>
          <option value="SL">Sick Leave (SL)</option>
          <option value="EL">Emergency Leave (EL)</option>
          <option value="OL">Other (OL)</option>
        </select>

        <label className="block mt-4">Reason</label>
        <textarea 
          rows="5" 
          className="border p-2 rounded w-full" 
          placeholder="Enter reason for leave"
        ></textarea>

        <button type="submit" className="primary-btn mt-6">
          Submit
        </button>
      </form>
    </main>
  </div>
</div>
)
}

export default LeaveFormPage;