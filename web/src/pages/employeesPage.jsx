import React, { useState, useEffect } from 'react'

const EmployeesPage = () => {
const [isHrOpen, setIsHrOpen] = useState(false)
const [searchTerm, setSearchTerm] = useState('')

useEffect(() => {
const handleOutsideClick = (event) => {
if (!event.target.matches('.drop-btn')) {
setIsHrOpen(false)
}
}
window.addEventListener('click', handleOutsideClick)
return () => window.removeEventListener('click', handleOutsideClick)
}, [])

const employees = [
{ id: '001', name: 'Jane Smith', position: 'Project Manager', dept: 'Operations', status: 'online' },
{ id: '002', name: 'Michael Brown', position: 'Data Analyst', dept: 'Finance', status: 'offline' },
{ id: '003', name: 'Emily Johnson', position: 'UX Designer', dept: 'Design', status: 'online' }
]

const filteredEmployees = employees.filter(emp =>
emp.name.toLowerCase().includes(searchTerm.toLowerCase())
)

return (
<div>
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
      <h2 className="text-2xl font-bold mb-6">Manage Employees</h2>

      <div className="employee-controls flex gap-4 mb-8">
        <input 
          type="text" 
          placeholder="Search employees by name..." 
          className="border p-2 rounded flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="primary-btn">Add Employee</button>
      </div>

      <section className="employee-table mb-10 overflow-x-auto">
        <table className="w-full text-left border-collapse bg-white shadow-sm rounded">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Position</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{emp.id}</td>
                <td className="p-3">{emp.name}</td>
                <td className="p-3">{emp.position}</td>
                <td className="p-3">{emp.dept}</td>
                <td className="p-3">
                  <span className={`status ${emp.status} inline-block w-3 h-3 rounded-full mr-2`}></span>
                  {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                </td>
                <td className="p-3 flex gap-2">
                  <button className="edit-btn px-3 py-1 bg-blue-100 text-blue-600 rounded">Edit</button>
                  <button className="delete-btn px-3 py-1 bg-red-100 text-red-600 rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="calendar-section">
          <h3 className="text-xl font-bold mb-4">Calendar (Today)</h3>
          <div className="calendar-box border p-10 rounded bg-white text-center text-gray-400">
            [Calendar grid for current day]
          </div>
        </section>

        <section className="active-employees">
          <h3 className="text-xl font-bold mb-4">Active Employees</h3>
          <ul className="bg-white border rounded p-4">
            {employees.map((emp) => (
              <li key={emp.id} className="flex items-center mb-2 last:mb-0">
                <span className={`status ${emp.status} inline-block w-3 h-3 rounded-full mr-3`}></span>
                {emp.name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  </div>
</div>
)
}

export default EmployeesPage;