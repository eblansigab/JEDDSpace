const ROLE_DEPARTMENTS = {
  'VP, Finance & Administration': 'Finance & Administration',
  'General Manager': 'Executive Management',
  'Administrative Officer': 'Finance & Administration',
  'Administrative Trainee': 'Finance & Administration',
  'IT and Drafting': 'IT and Drafting',
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
  'Driver': 'Operations',
  'Equipment Operator': 'Operations',
  'Utilityman': 'Operations',
}

export const getDepartmentForRole = (roleName, fallback = 'General') => {
  const normalizedRoleName = String(roleName || '').trim()
  return ROLE_DEPARTMENTS[normalizedRoleName] || fallback
}

export const withRoleDerivedFields = (data, roleName) => {
  const normalizedRoleName = String(roleName || data?.position || data?.role || '').trim()
  if (!normalizedRoleName) return data

  return {
    ...data,
    position: normalizedRoleName,
    role: normalizedRoleName,
    department: getDepartmentForRole(normalizedRoleName, data?.department || 'General'),
  }
}
