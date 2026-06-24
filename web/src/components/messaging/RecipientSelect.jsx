import { useEffect, useState } from 'react'
import { getEmployeeDirectory } from '../../services/messageService'

export default function RecipientSelect({
  value,
  onChange,
  employees = [],
  isLoading = false,
  disabled = false
}) {
  const [localOptions, setLocalOptions] = useState(employees)

  useEffect(() => {
    setLocalOptions(employees)
  }, [employees])

  const handleChange = (event) => {
    onChange(event.target.value)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled || isLoading}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        backgroundColor: '#fff',
        color: '#111827',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer'
      }}
    >
      <option value="">-- Select Recipient --</option>
      <option value="all">All Employees</option>
      {localOptions.map((employee) => (
        <option
          key={employee.employee_id}
          value={employee.email}
        >
          {employee.first_name} {employee.last_name} ({employee.email})
        </option>
      ))}
    </select>
  )
}
