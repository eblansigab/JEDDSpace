/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { employeeService } from '../services/employeeService'
import { registerUser } from '../services/authService'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../services/authContext'
import { alertService } from '../utils/alertService'
import { Button, Modal, PageHeader, SearchBar, StatusBadge, Table } from '../components'
import { getPositions } from '../constants/formOptions'
import { supabaseClient } from '../supabase/supabaseClient'
import { getDepartmentForRole, getRoleGroup } from '../utils/roleMetadata'
import { employeeRolesService } from '../services/employeeRolesService'

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

const normalizeUsername = (value) => String(value || '').trim().toLowerCase()

const getEmployeeName = (employee) => `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unnamed Employee'

const hydrateEmployeeRoleFields = (employee) => {
  const roleName = employee.position || employee.role || ''
  const shouldDeriveDepartment = !employee.department || String(employee.department).toLowerCase() === 'general'
  return {
    ...employee,
    department: shouldDeriveDepartment ? getDepartmentForRole(roleName, employee.department || '') : employee.department,
  }
}

const createEmptyForm = () => ({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  department: '',
  selectedRoleIds: [],
})

const ManageEmployeesPage = () => {
  const { user,profile } = useAuth()
  const [employees, setEmployees] = useState([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState(createEmptyForm)
  const [availableRoles, setAvailableRoles] = useState([])
  const [adminRoles, setAdminRoles] = useState([])
  const [engineeringRoles, setEngineeringRoles] = useState([])

  const fetchEmployees = async () => {
    try {
      const viewer = profile ? {
        roleId: profile.role_id,
        employeeId: profile.employee_id,
      } : null
      const data = await employeeService.getManageable(viewer)
      setEmployees((data || []).map(hydrateEmployeeRoleFields))
    } catch (error) {
      console.error('[ManageEmployees] Fetch employees failed', error)
      await alertService.error('Failed to load employees.')
    }
  }

  const loadAvailableRoles = async () => {
    if (!profile?.role_id) {
      setAvailableRoles([])
      setAdminRoles([])
      setEngineeringRoles([])
      return
    }

    try {
      const [positions, currentRole] = await Promise.all([
        getPositions(),
        supabaseClient
          .from('roles')
          .select('hierarchy_level')
          .eq('role_id', profile.role_id)
          .maybeSingle(),
      ])

      const currentHierarchyLevel = currentRole?.data?.hierarchy_level
      const filteredData = (positions || []).filter((role) => {
        if (!currentHierarchyLevel) return true
        return role.hierarchy_level > currentHierarchyLevel
      })

      setAvailableRoles(filteredData)
      setAdminRoles(filteredData.filter((role) => getRoleGroup(role.role_name) === 'Admin'))
      setEngineeringRoles(filteredData.filter((role) => getRoleGroup(role.role_name) === 'Engineering'))
    } catch (error) {
      console.error('[ManageEmployees] Failed to load roles for dropdown.', error)
      setAvailableRoles([])
      setAdminRoles([])
      setEngineeringRoles([])
    }
  }

  useEffect(() => {
    fetchEmployees()
    loadAvailableRoles()
  }, [profile?.role_id])

  const isVpSelected = (selectedIds) =>
    availableRoles.some(
      (role) =>
        selectedIds.includes(role.role_id) &&
        (role.is_protected === true || role.hierarchy_level === 1)
    )

  const groupOfSelected = (selectedIds) => {
    const groups = new Set(
      selectedIds
        .map((id) => availableRoles.find((role) => role.role_id === id)?.role_name)
        .filter(Boolean)
        .map((name) => getRoleGroup(name))
        .filter(Boolean)
    )
    return groups.size === 1 ? Array.from(groups)[0] : null
  }

  const toggleRole = (roleId) => {
    setForm((current) => {
      const selected = current.selectedRoleIds.includes(roleId)
      let next = selected
        ? current.selectedRoleIds.filter((id) => id !== roleId)
        : [...current.selectedRoleIds, roleId]

      if (!selected) {
        const role = availableRoles.find((r) => r.role_id === roleId)
        if (role && (role.is_protected === true || role.hierarchy_level === 1)) {
          next = [roleId]
        } else if (isVpSelected(next)) {
          next = next.filter((id) => {
            const r = availableRoles.find((x) => x.role_id === id)
            return r && (r.is_protected === true || r.hierarchy_level === 1)
          })
        } else {
          const lockedGroup = groupOfSelected([roleId])
          if (lockedGroup) {
            next = next.filter((id) => {
              const r = availableRoles.find((x) => x.role_id === id)
              return r && getRoleGroup(r.role_name) === lockedGroup
            })
          }
        }
      }

      const primaryId = next.length
        ? next.reduce((lowest, id) =>
            (availableRoles.find((r) => r.role_id === id)?.hierarchy_level ?? Infinity) <
            (availableRoles.find((r) => r.role_id === lowest)?.hierarchy_level ?? Infinity)
              ? id
              : lowest
          )
        : null
      const primaryRole = availableRoles.find((r) => r.role_id === primaryId)
      const derivedDepartment = primaryRole
        ? getRoleGroup(primaryRole.role_name) === 'Admin'
          ? 'Administration'
          : 'Engineering'
        : ''

      return { ...current, selectedRoleIds: next, department: derivedDepartment }
    })
  }

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

    if (form.selectedRoleIds.length === 0) {
      await alertService.warning('Please select at least one role.')
      return
    }

    const primaryId = form.selectedRoleIds.reduce((lowest, id) =>
      (availableRoles.find((r) => r.role_id === id)?.hierarchy_level ?? Infinity) <
      (availableRoles.find((r) => r.role_id === lowest)?.hierarchy_level ?? Infinity)
        ? id
        : lowest
    )
    const primaryRole = availableRoles.find((item) => item.role_id === primaryId)

    try {
      const result = await registerUser(
        trimmedEmail,
        form.password,
        form.confirmPassword,
        trimmedFirstName,
        trimmedLastName,
        primaryRole.role_name,
        'employee',
        getDepartmentForRole(primaryRole.role_name),
        normalizedUsername,
        form.selectedRoleIds
      )

      if (result?.employeeCreated) {
        await Promise.allSettled([
          notificationService.createNotification({
            title: 'Employee record created',
            message: `${trimmedFirstName} ${trimmedLastName} was added successfully.`,
            type: 'general',
            priority: 'Normal',
            userId: user?.id
          })
        ])
        try {
          await employeeRolesService.saveEmployeeRoles(result.employee_id, form.selectedRoleIds)
        } catch (roleErr) {
          console.error('[ManageEmployees] Failed to save additional roles:', roleErr)
        }
        await alertService.success('Employee added successfully.')
      } else if (result?.authAlreadyExists) {
        await alertService.success('Auth account already exists. Employee profile is ready.')
      } else {
        await alertService.success('Auth account created. Multi-role assignment will be applied automatically after email verification.')
      }

      resetForm()
      setIsAddOpen(false)
      await fetchEmployees()
    } catch (error) {
      console.error(error.message)
      await alertService.error('Failed to add employee.')
    }
  }

  const openEditEmployee = async (employee) => {
    setEditingEmployee(employee)

    let existingRoleIds = []
    try {
      existingRoleIds = await employeeRolesService.getEmployeeRoles(employee.employee_id)
    } catch (err) {
      console.error('[ManageEmployees] Failed to load employee roles:', err)
    }
    if (existingRoleIds.length === 0 && employee.role_id) {
      existingRoleIds = [employee.role_id]
    }

    const primaryId = existingRoleIds.length
      ? existingRoleIds.reduce((lowest, id) =>
          (availableRoles.find((r) => r.role_id === id)?.hierarchy_level ?? Infinity) <
          (availableRoles.find((r) => r.role_id === lowest)?.hierarchy_level ?? Infinity)
            ? id
            : lowest
        )
      : null
    const primaryRole = availableRoles.find((r) => r.role_id === primaryId)

    setForm({
      ...createEmptyForm(),
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      username: employee.username || '',
      department: primaryRole
        ? (getRoleGroup(primaryRole.role_name) === 'Admin' ? 'Administration' : 'Engineering')
        : (employee.department || ''),
      selectedRoleIds: existingRoleIds,
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

    if (form.selectedRoleIds.length === 0) {
      await alertService.warning('Please select at least one role.')
      return
    }

    const primaryId = form.selectedRoleIds.reduce((lowest, id) =>
      (availableRoles.find((r) => r.role_id === id)?.hierarchy_level ?? Infinity) <
      (availableRoles.find((r) => r.role_id === lowest)?.hierarchy_level ?? Infinity)
        ? id
        : lowest
    )
    const primaryRole = availableRoles.find((r) => r.role_id === primaryId)
    if (!primaryRole) {
      await alertService.warning('Invalid role selection.')
      return
    }

    try {
      await employeeRolesService.saveEmployeeRoles(editingEmployee.employee_id, form.selectedRoleIds)

      await employeeService.update(editingEmployee.employee_id, {
        username: normalizedUsername,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      })

      await Promise.allSettled([
        notificationService.createNotification({
          title: 'Employee record updated',
          message: `${getEmployeeName(editingEmployee)} was updated.`,
          type: 'general',
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
      console.error(error.message)
      await alertService.error('Failed to archive employee.')
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
        onToggleRole={toggleRole}
        onClose={() => {
          setIsAddOpen(false)
          resetForm()
        }}
        onSave={handleAddEmployee}
        mode="add"
        adminRoles={adminRoles}
        engineeringRoles={engineeringRoles}
      />

      <EmployeeModal
        visible={isEditOpen}
        title="Edit Employee"
        form={form}
        onChange={updateForm}
        onToggleRole={toggleRole}
        onClose={() => {
          setIsEditOpen(false)
          resetForm()
        }}
        onSave={handleUpdateEmployee}
        mode="edit"
        adminRoles={adminRoles}
        engineeringRoles={engineeringRoles}
      />
    </DashboardLayout>
  )
}

const profileServiceInitials = (employee) => {
  const first = String(employee.first_name || '').trim()[0] || ''
  const last = String(employee.last_name || '').trim()[0] || ''
  return `${first}${last}`.toUpperCase() || 'U'
}

const RoleCheckbox = ({ role, checked, disabled, isPrimary, onChange }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: 6,
      opacity: disabled ? 0.4 : 1,
      background: checked ? '#f1edff' : 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onChange(role.role_id)}
    />
    <span>{role.role_name}</span>
    {isPrimary && (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          background: '#1E0977',
          borderRadius: 10,
          padding: '2px 8px',
        }}
      >
        PRIMARY
      </span>
    )}
  </label>
)

const EmployeeModal = ({ visible, title, form, onChange, onToggleRole, onClose, onSave, mode, adminRoles, engineeringRoles }) => {
  const allRoles = [...(adminRoles || []), ...(engineeringRoles || [])]
  const selectedIds = form.selectedRoleIds || []
  const vpSelected = selectedIds.some((id) => {
    const role = [...adminRoles, ...engineeringRoles].find((r) => r.role_id === id)
    return role && (role.is_protected === true || role.hierarchy_level === 1)
  })
  const selectedGroup = (() => {
    const groups = new Set(
      selectedIds
        .map((id) => [...adminRoles, ...engineeringRoles].find((r) => r.role_id === id)?.role_name)
        .filter(Boolean)
        .map((name) => getRoleGroup(name))
        .filter(Boolean)
    )
    return groups.size === 1 ? Array.from(groups)[0] : null
  })()

  const primaryRoleId = selectedIds.length
    ? selectedIds.reduce((lowest, id) =>
        (allRoles.find((r) => r.role_id === id)?.hierarchy_level ?? Infinity) <
        (allRoles.find((r) => r.role_id === lowest)?.hierarchy_level ?? Infinity)
          ? id
          : lowest
      , selectedIds[0])
    : null

  const renderGroup = (label, roles) => {
    if (!roles || roles.length === 0) return null
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
        {roles.map((role) => {
          const checked = selectedIds.includes(role.role_id)
          const isPrimary = role.role_id === primaryRoleId
          const disabled =
            vpSelected ||
            (selectedGroup && getRoleGroup(role.role_name) !== selectedGroup)
          return (
            <RoleCheckbox
              key={role.role_id}
              role={role}
              checked={checked}
              disabled={disabled}
              isPrimary={isPrimary}
              onChange={onToggleRole}
            />
          )
        })}
      </div>
    )
  }

  return (
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
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Roles</label>
        {renderGroup('Admin Roles', adminRoles)}
        {renderGroup('Engineering Roles', engineeringRoles)}
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Department</label>
        <input
          type="text"
          value={form.department || ''}
          readOnly
          aria-label="Department derived from primary role"
        />
      </div>
    </Modal>
  )
}

export default ManageEmployeesPage
