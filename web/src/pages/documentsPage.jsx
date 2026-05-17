import React, { useState, useEffect } from 'react'

import logo from '../assets/JEDDSpace Logo (Transparent).png'

const DocumentsPage = () => {
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

const files = [
{ name: 'Document 1.pdf', path: 'files/Document1.pdf', date: '01/15/2023' },
{ name: 'Document 2.docx', path: 'files/Document2.docx', date: '02/10/2023' },
{ name: 'Presentation.pptx', path: 'files/Presentation.pptx', date: '03/05/2023' },
{ name: 'Report.pdf', path: 'files/Report.pdf', date: '03/20/2023' },
{ name: 'Invoice.xlsx', path: 'files/Invoice.xlsx', date: '04/02/2023' }
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
      <h1>Documents</h1>
      <p>Click on a file to download:</p>

      <ul className="file-list">
        {files.map((file, index) => (
          <li key={index}>
            <a href={file.path} download>{file.name}</a> 
            <span> Sent on: {file.date}</span>
          </li>
        ))}
      </ul>
    </main>
  </div>
</div>
)
}

export default DocumentsPage;