/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { employeeService } from '../services/employeeService'
import { registerUser } from '../services/authService'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { Button, Modal, PageHeader, SearchBar, StatusBadge, Table } from '../components'
import { DEPARTMENT_OPTIONS, getPositions } from '../constants/formOptions'
import { supabaseClient } from '../supabase/supabaseClient'

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

const normalizeUsername = (value) => String(value || '').trim().toLowerCase()

const getEmployeeName = (employee) => `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unnamed Employee'

const createEmptyForm = () => ({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  department: '',
  position: '',
  registration_status: 'approved',
  employment_status: 'active',
})

const ManageEmployeesPage = () => {
  const { user,profile } = useAuth()
  const [employees, setEmployees] = useState([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState(createEmptyForm)
  const [position,setPosition] = useState([])

  const fetchEmployees = async () => {
    try {
      const viewer = profile ? {
        roleId: profile.role_id,
        employeeId: profile.employee_id,
      } : null
      const data = await employeeService.getManageable(viewer)
      setEmployees(data || [])
    } catch (error) {
      console.error('[ManageEmployees] Fetch employees failed', error)
      await alertService.error('Failed to load employees.')
    }
  }

  const getPosition = async()=>{
    const [positions, currentRole] = await Promise.all([
      getPositions(),
      profile?.role_id
        ? supabaseClient
            .from('roles')
            .select('hierarchy_level')
            .eq('role_id', profile.role_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const currentHierarchyLevel = currentRole?.data?.hierarchy_level
    const filteredData = positions.filter((level) => {
      if (!currentHierarchyLevel) return true
      return level.hierarchy_level > currentHierarchyLevel
    })
    setPosition(filteredData)
  }

  useEffect(() => {
    fetchEmployees()
    getPosition()
  }, [])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'username' ? normalizeUsername(value) : value,
    }))
  }

  const resetForm = () => {
    setForm(createEmptyForm())
    setEditingEmployee(null)
  }

  const validateUsername = (username, currentEmployeeId = null) => {
    const normalizedUsername = normalizeUsername(username)

    if (!normalizedUsername) {
      return 'Username is required.'
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return 'Username must be 3-30 lowercase letters, numbers, or underscores with no spaces.'
    }

    const duplicate = employees.find((employee) =>
      String(employee.username || '').trim().toLowerCase() === normalizedUsername &&
      employee.employee_id !== currentEmployeeId
    )

    if (duplicate) {
      return 'Username is already taken.'
    }

    return ''
  }

  const handleAddEmployee = async () => {
    const trimmedFirstName = form.first_name.trim()
    const trimmedLastName = form.last_name.trim()
    const trimmedEmail = form.email.trim()
    const normalizedUsername = normalizeUsername(form.username)

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !normalizedUsername || !form.password || !form.confirmPassword) {
      await alertService.warning('Please fill all required fields.')
      return
    }

    const usernameError = validateUsername(normalizedUsername)
    if (usernameError) {
      await alertService.warning(usernameError)
      return
    }

    if (form.password !== form.confirmPassword) {
      await alertService.warning('Passwords do not match.')
      return
    }

    const selectedRole = position.find((item) => item.role_name === form.position)
    if (!selectedRole?.role_id) {
      await alertService.warning('Invalid position selected.')
      return
    }

    try {
      const result = await registerUser(
        trimmedEmail,
        form.password,
        form.confirmPassword,
        trimmedFirstName,
        trimmedLastName,
        selectedRole.role_name,
        'employee',
        form.department,
        normalizedUsername
      )

      if (result?.employeeCreated) {
        await Promise.allSettled([
          notificationService.createNotification({
            title: 'Employee record created',
            message: `${trimmedFirstName} ${trimmedLastName} was added successfully.`,
            type: 'employee_update',
            priority: 'Normal',
            userId: user?.id
          })
        ])
        await alertService.success('Employee added successfully.')
      } else if (result?.authAlreadyExists) {
        await alertService.success('Auth account already exists. Employee profile is ready.')
      } else {
        await alertService.success('Auth account created. Employee profile will be created after email verification.')
      }

      resetForm()
      setIsAddOpen(false)
      await fetchEmployees()
    } catch (error) {
      await alertService.error(error.message || 'Failed to add employee.')
    }
  }

  const openEditEmployee = (employee) => {
    setEditingEmployee(employee)
    setForm({
      ...createEmptyForm(),
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      username: employee.username || '',
      department: employee.department || 'general',
      position: employee.position || 'employee',
      registration_status: employee.registration_status || 'approved',
      employment_status: employee.employment_status || 'active',
    })
    setIsEditOpen(true)
  }

  const handleUpdateEmployee = async () => {
    if (!editingEmployee?.employee_id) return

    const normalizedUsername = normalizeUsername(form.username)
    const usernameError = validateUsername(normalizedUsername, editingEmployee.employee_id)

    if (usernameError) {
      await alertService.warning(usernameError)
      return
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      await alertService.warning('First name and last name are required.')
      return
    }

    const selectedRole = position.find((item) => item.role_name === form.position)
    if (!selectedRole?.role_id) {
      await alertService.warning('Invalid position selected.')
      return
    }

    const currentRoleHierarchy = profile?.role_id
      ? await supabaseClient
          .from('roles')
          .select('hierarchy_level')
          .eq('role_id', profile.role_id)
          .maybeSingle()
          .then((r) => r.data?.hierarchy_level)
      : null

    if (selectedRole.hierarchy_level && currentRoleHierarchy && selectedRole.hierarchy_level <= currentRoleHierarchy) {
      await alertService.warning('Invalid position.')
      return
    }

    try {
      await employeeService.update(editingEmployee.employee_id, {
        username: normalizedUsername,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        department: form.department,
        role_id: selectedRole.role_id,
        registration_status: form.registration_status,
        employment_status: form.employment_status,
      })

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'Employee record updated',
          message: `${getEmployeeName(editingEmployee)} was updated.`,
          type: 'employee_update',
          priority: 'Normal',
          userId: user?.id
        })
      ])

      await alertService.success('Employee updated.')
      resetForm()
      setIsEditOpen(false)
      await fetchEmployees()
    } catch (error) {
      await alertService.error('Failed to update employee.')
      console.error(error.message)
    }
  }

  const handleDeleteEmployee = async (employeeId) => {
    const confirmDelete = await alertService.confirm({
      title: 'Archive employee?',
      text: 'This will mark the employee as inactive and hide them from active workflows.',
      confirmButtonText: 'Archive',
      cancelButtonText: 'Cancel'
    })

    if (!confirmDelete.isConfirmed) return

    try {
      await employeeService.remove(employeeId)
      await alertService.success('Employee archived.')
      await fetchEmployees()
    } catch (error) {
      await alertService.error(error.message || 'Failed to archive employee.')
    }
  }

  const filteredEmployees = employees.filter((employee) => {
    const query = searchTerm.toLowerCase()
    const name = getEmployeeName(employee).toLowerCase()

    return (
      name.includes(query) ||
      String(employee.username || '').toLowerCase().includes(query) ||
      String(employee.department || '').toLowerCase().includes(query) ||
      String(employee.position || '').toLowerCase().includes(query)
    )
  })

  const columns = [
    {
      key: 'avatar',
      title: 'Avatar',
      render: (_, row) => (
        <div className="profile-avatar" style={{ width: 38, height: 38, fontSize: 14, borderRadius: '50%', background: '#1E0977', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {profileServiceInitials(row)}
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
    { key: 'username', title: 'Username', render: (value) => value || 'Not set' },
    { key: 'department', title: 'Department', render: (value) => value || '—' },
    { key: 'position', title: 'Position', render: (value) => value || '—' },

    {
      key: 'employment_status',
      title: 'Employment Status',
      render: (value) => <StatusBadge status={value || 'active'} />
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" style={{ minWidth: 72 }} onClick={() => openEditEmployee(row)}>
            Edit
          </Button>
          <Button variant="danger" style={{ minWidth: 72 }} onClick={() => handleDeleteEmployee(row.employee_id)}>
            Archive
          </Button>
        </div>
      )
    }
  ]

  return (
    <DashboardLayout>
      <main className="content">
        <PageHeader
          title="Manage Employees"
          actions={[
            <Button key="add-employee" onClick={() => {
              resetForm()
              setIsAddOpen(true)
            }}>
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
      </main>

      <EmployeeModal
        visible={isAddOpen}
        title="Add Employee"
        form={form}
        onChange={updateForm}
        onClose={() => {
          setIsAddOpen(false)
          resetForm()
        }}
        onSave={handleAddEmployee}
        mode="add"
        position={position}
      />

      <EmployeeModal
        visible={isEditOpen}
        title="Edit Employee"
        form={form}
        onChange={updateForm}
        onClose={() => {
          setIsEditOpen(false)
          resetForm()
        }}
        onSave={handleUpdateEmployee}
        mode="edit"
        position={position}
      />
    </DashboardLayout>
  )
}

const profileServiceInitials = (employee) => {
  const first = String(employee.first_name || '').trim()[0] || ''
  const last = String(employee.last_name || '').trim()[0] || ''
  return `${first}${last}`.toUpperCase() || 'U'
}

const EmployeeModal = ({ visible, title, form, onChange, onClose, onSave, mode, position }) => (
  <Modal
    visible={visible}
    title={title}
    onClose={onClose}
    footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    }
  >
    <div style={{ display: 'grid', gap: 12 }}>
      <input
        type="text"
        placeholder="First Name"
        value={form.first_name}
        onChange={(event) => onChange('first_name', event.target.value)}
      />
      <input
        type="text"
        placeholder="Last Name"
        value={form.last_name}
        onChange={(event) => onChange('last_name', event.target.value)}
      />
      <input
        type="text"
        placeholder="Username"
        value={form.username}
        onChange={(event) => onChange('username', event.target.value)}
      />
      {mode === 'add' && (
        <>
          <input
            type="email"
            placeholder="Account setup email"
            value={form.email}
            onChange={(event) => onChange('email', event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(event) => onChange('confirmPassword', event.target.value)}
          />
        </>
      )}
      <select value={form.department} onChange={(event) => onChange('department', event.target.value)}>
        {DEPARTMENT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Position / Role</label>
          <select value={form.position} onChange={(event) => onChange('position', event.target.value)}>
            {position.map((item) => <option key={item.role_name} value={item.role_name}>{item.role_name}</option>)}
          </select>
      <select value={form.registration_status} onChange={(event) => onChange('registration_status', event.target.value)}>
        <option value="pending">pending</option>
        <option value="approved">approved</option>
        <option value="rejected">rejected</option>
      </select>
      <select value={form.employment_status} onChange={(event) => onChange('employment_status', event.target.value)}>
        <option value="active">active</option>
        <option value="inactive">inactive</option>
        <option value="resigned">resigned</option>
        <option value="terminated">terminated</option>
      </select>
    </div>
  </Modal>
)

export default ManageEmployeesPage
