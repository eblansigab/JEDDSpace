const ROLE_DEPARTMENTS = {
  'VP, Finance & Administration': 'Administration',
  'General Manager': 'Administration',
  'Administrative Officer': 'Administration',
  'Administrative Trainee': 'Administration',
  'IT and Drafting': 'Administration',
  'Engineering Division Manager': 'Engineering',
  'Engineering Supervisor': 'Engineering',
  'Department Manager': 'Engineering',
  'Head, Civil Works Group': 'Engineering',
  'Senior Engineer': 'Engineering',
  'Engineer': 'Engineering',
  'Electronic Engineer Trainee': 'Engineering',
  'Electronics Engineer Trainee': 'Engineering',
  'Senior Technician': 'Engineering',
  'Technician': 'Engineering',
  'Driver': 'Engineering',
  'Equipment Operator': 'Engineering',
  'Utilityman': 'Engineering',
}

export const getDepartmentForRole = (roleName, fallback = 'General') => {
  const normalizedRoleName = String(roleName || '').trim()
  return ROLE_DEPARTMENTS[normalizedRoleName] || fallback
}

export const ROLE_GROUP = {
  Admin: new Set([
    'VP, Finance & Administration',
    'General Manager',
    'Administrative Officer',
    'Administrative Trainee',
    'IT and Drafting',
  ]),
  Engineering: new Set([
    'Engineering Division Manager',
    'Engineering Supervisor',
    'Department Manager',
    'Head, Civil Works Group',
    'Senior Engineer',
    'Engineer',
    'Electronic Engineer Trainee',
    'Electronics Engineer Trainee',
    'Senior Technician',
    'Technician',
    'Driver',
    'Equipment Operator',
    'Utilityman',
  ]),
}

export const getRoleGroup = (roleName) => {
  const normalizedRoleName = String(roleName || '').trim()
  if (ROLE_GROUP.Admin.has(normalizedRoleName)) return 'Admin'
  if (ROLE_GROUP.Engineering.has(normalizedRoleName)) return 'Engineering'
  return null
}

export const withRoleDerivedFields = (data, roleName) => {
  const normalizedRoleName = String(roleName || data?.position || data?.role || '').trim()
  if (!normalizedRoleName) return data

  const derivedDepartment = getDepartmentForRole(normalizedRoleName, data?.department || 'General')

  return {
    ...data,
    position: normalizedRoleName,
    department: derivedDepartment,
  }
}
