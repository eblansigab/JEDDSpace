import React, { useState, useEffect } from 'react'
import logo from "../assets/JEDDSpace Logo (Transparent).png";

const EmailsPage = () => {
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

const activeEmployees = [
{ id: 1, name: 'Sender Name 1', avatar: 'avatar1.png' },
{ id: 2, name: 'Sender Name 2', avatar: 'avatar2.png' },
{ id: 3, name: 'Sender Name 3', avatar: 'avatar3.png' },
{ id: 4, name: 'Sender Name 4', avatar: 'avatar4.png' },
{ id: 5, name: 'Sender Name 5', avatar: 'avatar5.png' }
]

const inboxMessages = [
{ id: 1, sender: 'Sender Name 1', subject: 'Subject line of the email goes here', time: '2:30 PM' },
{ id: 2, sender: 'Sender Name 2', subject: 'Another subject line for your email', time: '1:15 PM' },
{ id: 3, sender: 'Sender Name 3', subject: 'Email subject line example', time: '12:45 PM' },
{ id: 4, sender: 'Sender Name 4', subject: 'Yet another subject line', time: '11:30 AM' },
{ id: 5, sender: 'Sender Name 5', subject: 'Follow-up on previous email', time: '10:00 AM' }
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
      <h1>Emails</h1>
      <div className="email-layout">
        <aside className="active-bar">
          <h3>Active Employees</h3>
          <ul>
            {activeEmployees.map((emp) => (
              <li key={emp.id}>
                <img src={emp.avatar} alt="" /> {emp.name}
              </li>
            ))}
          </ul>
        </aside>

        <section className="inbox">
          <h2>Inbox</h2>
          <table>
            <tbody>
              {inboxMessages.map((msg) => (
                <tr key={msg.id}>
                  <td><strong>{msg.sender}</strong></td>
                  <td>{msg.subject}</td>
                  <td>{msg.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="compose">
          <h3>Compose Email</h3>
          <label>To:</label>
          <input type="text" placeholder="Enter recipient email" />

          <label>Subject:</label>
          <input type="text" placeholder="Enter subject" />

          <label>Message:</label>
          <textarea rows="6" placeholder="Write your message here..."></textarea>

          <button className="primary-btn">Send</button>
        </section>
      </div>
    </main>
  </div>
</div>
)
}

export default EmailsPage;