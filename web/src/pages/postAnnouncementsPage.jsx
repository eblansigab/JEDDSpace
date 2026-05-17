import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'

const PostAnnouncement = () => {
const [isHrOpen, setIsHrOpen] = useState(false)
const [title, setTitle] = useState('')
const [content, setContent] = useState('')

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
      <h1>Post Announcement</h1>

      <section className="announcement-management">
        <h3>Create Announcement</h3>
        <label className="block mb-1">Title</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter announcement title" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block mb-1">Content</label>
        <textarea 
          rows="6" 
          className="border p-2 rounded w-full mb-4"
          placeholder="Write your announcement here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        <button type="submit" className="primary-btn">Publish</button>
      </section>

      <section className="announcement-output mt-8">
        <h3>Preview (Employee View)</h3>
        <div className="announcement-box p-4 border rounded bg-white shadow-sm">
          <h4 className="font-bold text-lg">{title || '[Announcement Title]'}</h4>
          <p className="date text-sm text-gray-500 mb-2">
            Published on: {new Date().toLocaleDateString()}
          </p>
          <p className="whitespace-pre-wrap">{content || '[Announcement Content]'}</p>
        </div>
      </section>
    </main>
  </div>
</div>
)
}

export default PostAnnouncement