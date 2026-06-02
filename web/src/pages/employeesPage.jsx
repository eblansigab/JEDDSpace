import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { employeeService } from '../services/employeeService'
import { Button, PageHeader, SearchBar, StatusBadge, Table } from '../components'

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAll()
      setEmployees(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        [emp.first_name, emp.last_name, emp.position, emp.department]
          .map((value) => value || '')
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [employees, searchTerm]
  )

  const columns = [
    { key: 'employee_id', title: 'ID' },
    {
      key: 'name',
      title: 'Name',
      render: (_, row) => `${row.first_name} ${row.last_name}`
    },
    { key: 'position', title: 'Position' },
    { key: 'department', title: 'Department' },
    {
      key: 'status',
      title: 'Status',
      render: () => <StatusBadge status="active" />
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline">Edit</Button>
          <Button variant="danger">Delete</Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <DashboardLayout />
      <div className="layout">
        <Sidebar />

        <main className="content">
          <PageHeader
            title="Manage Employees"
            actions={[
              <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search employees by name..." />, 
              <Button key="add" onClick={() => {}}>
                Add Employee
              </Button>
            ]}
          />

          <Table columns={columns} data={filteredEmployees} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ marginTop: 32 }}>
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
                  <li key={emp.employee_id} className="flex items-center mb-2 last:mb-0">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', marginRight: 10 }}></span>
                    {emp.first_name} {emp.last_name}
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
