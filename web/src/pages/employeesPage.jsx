import React, { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { employeeService } from '../services/employeeService'
import { Button, PageHeader, SearchBar, StatusBadge, Table } from '../components'

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAll()
      setEmployees(data || [])
    } catch (error) {
      console.error('[EmployeesPage] Fetch employees failed', error)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const getEmployeeName = (emp) => `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed'

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        const query = searchTerm.toLowerCase()
        return (
          getEmployeeName(emp).toLowerCase().includes(query) ||
          String(emp.position || '').toLowerCase().includes(query) ||
          String(emp.department || '').toLowerCase().includes(query) ||
          String(emp.role || '').toLowerCase().includes(query)
        )
      }),
    [employees, searchTerm]
  )

  const getInitials = (emp) => {
    const first = String(emp.first_name || '').trim()[0] || ''
    const last = String(emp.last_name || '').trim()[0] || ''
    return `${first}${last}`.toUpperCase() || 'U'
  }

  const columns = [
    {
      key: 'avatar',
      title: 'Avatar',
      render: (_, row) => (
        <div
          className="profile-avatar"
          style={{
            width: 36,
            height: 36,
            fontSize: 12,
            borderRadius: '50%',
            background: '#1E0977',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {getInitials(row)}
        </div>
      )
    },
    {
      key: 'employee',
      title: 'Employee',
      render: (_, row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{getEmployeeName(row)}</strong>
          <span style={{ color: '#64748b', fontSize: 12 }}>{row.employee_type || 'staff'}</span>
        </div>
      )
    },
    { key: 'department', title: 'Department', render: (value) => value || '—' },
    { key: 'position', title: 'Position', render: (value) => value || '—' },
    { key: 'role', title: 'Role', render: (value) => value || 'employee' },
    {
      key: 'registration_status',
      title: 'Account Status',
      render: (value) => <StatusBadge status={value || 'pending'} />
    },
    {
      key: 'employment_status',
      title: 'Employment Status',
      render: (value) => <StatusBadge status={value || 'active'} />
    }
  ]

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Employees"
          actions={[
            <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search employees..." />
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
                  {getEmployeeName(emp)}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </DashboardLayout>
  )
}

export default EmployeesPage;