import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import { supabaseClient } from '../supabase/supabaseClient'

const AssignJobsPage = () => {
  const [isHrOpen, setIsHrOpen] = useState(false)
  const [jobs, setJobs] = useState([])
  const [isFormVisible, setIsFormVisible] = useState(false)

  // FORM STATES
  const [employeeId, setEmployeeId] = useState('')
  const [department, setDepartment] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // FETCH JOBS
  const fetchJobs = async () => {
    const { data, error } = await supabaseClient
      .from('job')
      .select('*')

    if (error) {
      console.error(error)
      return
    }

    setJobs(data)
  }

  // RESET FORM
  const resetForm = () => {
    setEmployeeId('')
    setDepartment('')
    setDestination('')
    setStartDate('')
    setEndDate('')
    setIsFormVisible(false)
  }

  // ADD JOB
  const handleAddJob = async () => {
    const parsedEmpId = parseInt(employeeId)

    if (
      isNaN(parsedEmpId) ||
      !department ||
      !destination ||
      !startDate ||
      !endDate
    ) {
      alert('Please fill all fields')
      return
    }

    // CHECK IF EMPLOYEE EXISTS
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employee')
      .select('employee_id')
      .eq('employee_id', parsedEmpId)
      .single()

    if (employeeError || !employee) {
      alert('Employee ID not found')
      return
    }

    // INSERT JOB
    const { error } = await supabaseClient
      .from('job')
      .insert([
        {
          employee_id: parsedEmpId,
          department,
          destination,
          start_date: startDate,
          end_date: endDate,
          status: 'open'
        }
      ])

    if (error) {
      alert(error.message)
      return
    }

    alert('Job assigned successfully')

    resetForm()
    fetchJobs()
  }

  // EDIT JOB
  const handleEditJob = async (job_id) => {
    const newDestination = prompt('Enter new destination')

    if (!newDestination) return

    const { error } = await supabaseClient
      .from('job')
      .update({
        destination: newDestination
      })
      .eq('job_id', job_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Job updated successfully')

    fetchJobs()
  }

  // COMPLETE JOB
  const handleCompleteJob = async (job_id) => {
    const { error } = await supabaseClient
      .from('job')
      .update({
        status: 'closed'
      })
      .eq('job_id', job_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Job marked as completed')

    fetchJobs()
  }

  // DELETE JOB
  const handleDeleteJob = async (job_id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this job?'
    )

    if (!confirmDelete) return

    const { error } = await supabaseClient
      .from('job')
      .delete()
      .eq('job_id', job_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Job deleted')

    fetchJobs()
  }

  // USE EFFECT
  useEffect(() => {
    fetchJobs()

    const handleOutsideClick = (event) => {
      if (!event.target.matches('.drop-btn')) {
        setIsHrOpen(false)
      }
    }

    window.addEventListener('click', handleOutsideClick)

    return () =>
      window.removeEventListener('click', handleOutsideClick)
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
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/documents">Documents</a></li>
            <li><a href="/emails">Email</a></li>
            <li><a href="/contracts">Contracts</a></li>
            <li><a href="/announcements">Announcements</a></li>

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

              <ul className={`dropdown ${isHrOpen ? '' : 'hidden'}`}>
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
          <h1>Travel Job Assignment</h1>

          {/* TOP CONTROLS */}
          <div className="job-controls">
            <input
              type="text"
              placeholder="Search jobs..."
            />

            <button
              className="primary-btn"
              onClick={() =>
                setIsFormVisible(!isFormVisible)
              }
            >
              {isFormVisible
                ? 'Close Form'
                : 'Assign New Job'}
            </button>
          </div>

          {/* FORM */}
          {isFormVisible && (
            <section className="dashboard-widget">
              <h3 style={{ marginBottom: '15px' }}>
                Assign New Job
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}
              >
                <div>
                  <label>Employee ID</label>

                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) =>
                      setEmployeeId(e.target.value)
                    }
                    placeholder="e.g. 1"
                  />
                </div>

                <div>
                  <label>Department</label>

                  <input
                    type="text"
                    value={department}
                    onChange={(e) =>
                      setDepartment(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Destination</label>

                  <input
                    type="text"
                    value={destination}
                    onChange={(e) =>
                      setDestination(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Start Date</label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>End Date</label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.target.value)
                    }
                  />
                </div>

                <div style={{ alignSelf: 'end' }}>
                  <button
                    className="primary-btn"
                    onClick={handleAddJob}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* JOB TABLE */}
          <section className="job-table">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Destination</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {jobs.map((job) => (
                  <tr key={job.job_id}>
                    <td>{job.job_id}</td>
                    <td>{job.employee_id}</td>
                    <td>{job.department}</td>
                    <td>{job.destination}</td>
                    <td>{job.start_date}</td>
                    <td>{job.end_date}</td>
                    <td>{job.status}</td>

                    <td
                      style={{
                        display: 'flex',
                        gap: '8px'
                      }}
                    >
                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleEditJob(job.job_id)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="primary-btn"
                        onClick={() =>
                          handleCompleteJob(job.job_id)
                        }
                      >
                        Complete
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          handleDeleteJob(job.job_id)
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
        </main>
      </div>
    </div>
  )
}

export default AssignJobsPage