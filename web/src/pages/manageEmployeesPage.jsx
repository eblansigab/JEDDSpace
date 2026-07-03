import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { employeeService } from '../services/employeeService'
import { registerUser } from '../services/authService'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { Button, Modal, PageHeader, SearchBar, StatusBadge, Table } from '../components'

const ManageEmployeesPage = () => {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAll()
      setEmployees(data)
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        label: 'Fetch employees failed',
        message: error?.message ?? String(error),
        details: error?.details ?? null,
        hint: error?.hint ?? null,
        code: error?.code ?? null,
        stack: error?.stack ?? null,
        error,
      }))
    }
  }

  const handleAddEmployee = async () => {
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const fallbackLastName = trimmedLastName || email.trim().split('@')[0] || 'User'

    if (!trimmedFirstName || !fallbackLastName || !email || !password || !confirmPassword) {
      await alertService.warning('Please fill all fields')
      return
    }

    if (password !== confirmPassword) {
      await alertService.warning('Passwords do not match')
      return
    }

    try {
      await registerUser(
        email.trim(),
        password,
        confirmPassword,
        trimmedFirstName,
        fallbackLastName,
        'employee',
        'employee',
        'general',
        )

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'Employee record created',
          message: `${firstName} ${lastName} was added successfully!`,
          type: 'employee_update',
          priority: 'Normal',
          userId: user?.id
        })
      ])

      await alertService.success('Employee added and registered successfully')
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setIsAddOpen(false)
      fetchEmployees()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  const handleDeleteEmployee = async (employee_id) => {
    const confirmDelete = await alertService.confirm({
      title: 'Delete employee?',
      text: 'This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    })

    if (!confirmDelete.isConfirmed) return

    try {
      await employeeService.remove(employee_id)
      await alertService.success('Employee deleted')
      fetchEmployees()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  const handleEditEmployee = async (employee_id, currentPosition) => {
    const promptResult = await alertService.input({
      title: 'Edit Position',
      text: 'Choose the employee position.',
      input: 'select',
      inputValue: currentPosition || 'employee',
      inputOptions: POSITION_OPTIONS.reduce((options, item) => ({ ...options, [item]: item }), {}),
      confirmButtonText: 'Save'
    })

    if (!promptResult.isConfirmed) return

    const newPosition = promptResult.value?.trim()
    if (!newPosition) return

    try {
      await employeeService.update(employee_id, {
        position: newPosition
      })

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'Employee record updated',
          message: `Employee #${employee_id} position changed to ${newPosition}.`,
          type: 'employee_update',
          priority: 'Normal',
          userId: user?.id
        })
      ])

      await alertService.success('Employee updated')
      fetchEmployees()
    } catch (error) {
      await alertService.error(error.message)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const filteredEmployees = employees.filter((emp) => {
    const query = searchTerm.toLowerCase()
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase()
    return (
      name.includes(query) ||
      String(emp.position || '').toLowerCase().includes(query) ||
      String(emp.role || '').toLowerCase().includes(query)
    )
  })

  const columns = [
    { key: 'employee_id', title: 'ID' },
    {
      key: 'name',
      title: 'Name',
      render: (_, row) => `${row.first_name} ${row.last_name}`
    },
    { key: 'position', title: 'Position' },
    { key: 'role', title: 'Role' },
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
          <Button variant="outline" style={{ minWidth: 72 }} onClick={() => handleEditEmployee(row.employee_id, row.position)}>
            Edit
          </Button>
          <Button variant="danger" style={{ minWidth: 72 }} onClick={() => handleDeleteEmployee(row.employee_id)}>
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <DashboardLayout>
        <main className="content">
          <PageHeader
            title="Manage Employees"
            actions={[
              <Button key="add-employee" onClick={() => setIsAddOpen(true)}>
                Add Employee
              </Button>
            ]}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search employees..." />
            <Button variant="outline" onClick={fetchEmployees}>
              Refresh
            </Button>
          </div>

          <Table columns={columns} data={filteredEmployees} />

          <section style={{ marginTop: 28 }}>
            <h3>Employee List</h3>
            <ul>
              {filteredEmployees.map((emp) => (
                <li key={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </li>
              ))}
            </ul>
          </section>
        </main>
      <Modal
        visible={isAddOpen}
        title="Add Employee"
        onClose={() => setIsAddOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee}>Save</Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </Modal>
      </DashboardLayout>
    </>
  )
}

export default ManageEmployeesPage
