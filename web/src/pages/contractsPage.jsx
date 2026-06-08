import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'

const ContractsPage = () => {
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

const contractsData = [
{
commissioner: 'John Doe',
status: 'ongoing',
address: '123 Main St, City, State',
content: 'Description of the commission.',
employees: [
{ name: 'Jane Smith', role: 'Project Manager' },
{ name: 'Michael Brown', role: 'Data Analyst' }
]
},
{
commissioner: 'Emily Johnson',
status: 'ongoing',
address: '456 Elm St, City, State',
content: 'Description of the commission.',
employees: [
{ name: 'Sarah Wilson', role: 'HR Specialist' }
]
},
{
commissioner: 'Michael Brown',
status: 'cancelled',
address: '789 Pine St, City, State',
content: 'Description of the commission.',
employees: [
{ name: 'John Doe', role: 'Software Engineer' }
]
},
{
commissioner: 'Sarah Wilson',
status: 'completed',
address: '101 Maple St, City, State',
content: 'Description of the commission.',
employees: [
{ name: 'Emily Johnson', role: 'UX Designer' }
]
}
]

return (
    <DashboardLayout>
        <main className="content">
      <h1>Commission Contracts</h1>

      {contractsData.map((contract, index) => (
        <div key={index} className="contract-box">
          <h3>
            Commissioner: {contract.commissioner} 
            <span className={`status ${contract.status}`}></span>
          </h3>
          <p><strong>Address:</strong> {contract.address}</p>
          <p><strong>Content:</strong> {contract.content}</p>
          <h4>Employees Assigned:</h4>
          <ul>
            {contract.employees.map((emp, empIndex) => (
              <li key={empIndex}>
                {emp.name} – {emp.role}
              </li>
            ))}
          </ul>
        </div>
      ))}
            </main>
    </DashboardLayout>
)
}

export default ContractsPage;