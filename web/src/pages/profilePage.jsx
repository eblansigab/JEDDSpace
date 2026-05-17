import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'


const ProfileSettings = () => {
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
      <h1>Profile Settings</h1>

      <section className="profile-section">
        <h3>Full Name</h3>
        <p className="mb-4">John Doe</p>

        <h3>Contact Information</h3>
        <p>Email: john.doe@example.com</p>
        <p>Phone: (123) 456-7890</p>
        <p className="mb-4">LinkedIn: [linkedin.com/in/johndoe](https://linkedin.com/in/johndoe)</p>
      </section>

      <section className="profile-section">
        <h3>Change Password</h3>
        <label className="block mb-1">Current Password</label>
        <input 
          type="password" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Password" 
        />

        <label className="block mb-1">New Password</label>
        <input 
          type="password" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter New Password" 
        />

        <button className="primary-btn">Update Password</button>
      </section>

      <section className="profile-section">
        <h3>Change Profile Picture</h3>
        <div className="picture-box w-24 h-24 border flex items-center justify-center bg-gray-200 mb-4 rounded">
          100 × 100
        </div>
        <button className="primary-btn">Change Picture</button>
      </section>

      <section className="profile-section">
        <h3>Two-Factor Authentication</h3>
        <p className="mb-4">Enable two-factor authentication for enhanced security.</p>
        <label className="block mb-1">Authenticator Code</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Code" 
        />
        <button className="primary-btn">Add Authenticator</button>
      </section>
    </main>
  </div>
</div>
)
}

export default ProfileSettings