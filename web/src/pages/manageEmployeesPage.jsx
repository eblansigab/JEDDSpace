import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import { supabaseClient } from '../supabase/supabaseClient'

const ManageEmployeesPage = () => {

  const [isHrOpen, setIsHrOpen] = useState(false)
  const [id, setID] = useState([])
  const [employees, setEmployees] = useState([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')

  // =========================
  // FETCH EMPLOYEES
  // =========================

  const fetchEmployees = async () => {

    const { data, error } = await supabaseClient
      .from('employee')
      .select('*')

    if (error) {
      console.log(error)
      return
    }

    setEmployees(data)
  }

  // =========================
  // ADD EMPLOYEE
  // =========================

  const handleAddEmployee = async () => {
if (
  !firstName ||
  !lastName ||
  !position ||
  !department
) {
  alert('Please fill all fields')
  return
}
    const { error } = await supabaseClient
      .from('employee')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          position,
          department
        }
      ])

    if (error) {
      alert(error.message)
      return
    }

    alert('Employee added successfully')

    setFirstName('')
    setLastName('')
    setPosition('')
    setDepartment('')

    fetchEmployees()
  }

  // =========================
  // DELETE EMPLOYEE
  // =========================

  const handleDeleteEmployee = async (employee_id) => {

    const confirmDelete =
      window.confirm('Delete this employee?')

    if (!confirmDelete) return

    const { error } = await supabaseClient
      .from('employee')
      .delete()
      .eq('employee_id', employee_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Employee deleted')

    fetchEmployees()
  }

  // =========================
  // EDIT EMPLOYEE
  // =========================

  const handleEditEmployee = async (employee_id) => {

    const newPosition =
      prompt('Enter new position')

    if (!newPosition) return

    const { error } = await supabaseClient
      .from('employee')
      .update({
        position: newPosition
      })
      .eq('employee_id', employee_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Employee updated')

    fetchEmployees()
  }

  // =========================
  // USE EFFECT
  // =========================

  useEffect(() => {

    fetchEmployees()

    const handleOutsideClick = (event) => {

      if (!event.target.matches('.drop-btn')) {
        setIsHrOpen(false)
      }
    }

    window.addEventListener(
      'click',
      handleOutsideClick
    )

    return () => {
      window.removeEventListener(
        'click',
        handleOutsideClick
      )
    }

  }, [])

  return (

    <div>

      {/* HEADER */}

      <header>
        <a href="/dashboard">

          <img
            className="max-w-3xs"
            src={logo}
            alt="JEDDSpace Logo"
            style={{ width: '220px' }}
          />

        </a>
      </header>

      <div className="layout">

        {/* SIDEBAR */}

        <nav className="sidebar">

          <ul>

            <li>
              <a href="/dashboard">
                Dashboard
              </a>
            </li>

            <li>
              <a href="/documents">
                Documents
              </a>
            </li>

            <li>
              <a href="/emails">
                Email
              </a>
            </li>

            <li>
              <a href="/contracts">
                Contracts
              </a>
            </li>

            <li>
              <a href="/announcements">
                Announcements
              </a>
            </li>

            {/* HR DROPDOWN */}

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

              <ul
                className={`dropdown ${
                  isHrOpen ? '' : 'hidden'
                }`}
              >

                <li>
                  <a href="/official-business">
                    Official Business Form
                  </a>
                </li>

                <li>
                  <a href="/leave-form">
                    Leave Form
                  </a>
                </li>

              </ul>

            </li>

            <li>
              <a href="/admin-dashboard">
                Admin Dashboard
              </a>
            </li>

          </ul>

        </nav>

        {/* MAIN CONTENT */}

        <main className="content">

          <h1>Manage Employees</h1>

          {/* ADD EMPLOYEE */}

          <section className="employee-controls">

            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) =>
                setFirstName(e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) =>
                setLastName(e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Position"
              value={position}
              onChange={(e) =>
                setPosition(e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Department"
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
            />

            <button
              className="primary-btn"
              onClick={handleAddEmployee}
            >
              Add Employee
            </button>

          </section>

          {/* EMPLOYEE TABLE */}

          <section className="employee-table">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {employees.map((emp) => (

                  <tr key={emp.employee_id}>

                    <td>{emp.employee_id}</td>

                    <td>
                      {emp.first_name} {emp.last_name}
                    </td>

                    <td>{emp.position}</td>

                    <td>{emp.department}</td>

                    <td>Active</td>

                    <td>

                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleEditEmployee(emp.employee_id)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          handleDeleteEmployee(emp.employee_id)
                        }
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </section>

          {/* ACTIVE EMPLOYEES */}

          <section className="active-employees">

            <h3>Employee List</h3>

            <ul>

              {employees.map((emp) => (

                <li key={emp.id}>

                  {emp.first_name} {emp.last_name}

                </li>

              ))}

            </ul>

          </section>

        </main>

      </div>

    </div>
  )
}

export default ManageEmployeesPage