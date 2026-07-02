import React, { useState } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { SendBusinessForm } from '../components/sendForm'
import Swal from "sweetalert2";

const OfficialBusinessFormPage = () => {
    const [project, setProject] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [address, setAddress] = useState("")
    const [car, setCar] = useState("")
    const [driver, setDriver] = useState("")
    const [phone, setPhone] = useState("")

    return (
        <DashboardLayout>
            <main className="content">
                <h3>Official Business Form</h3>

                <form className="business-form" onSubmit={async (e) => {
                    e.preventDefault()

                    const confirm = await Swal.fire({
                        title: 'Submit Form?',
                        text: 'Are you sure you want to submit this Official Business Form?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, submit it',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#aaa'
                    })

                    if (!confirm.isConfirmed) return

                    Swal.fire({
                        title: 'Submitting...',
                        text: 'Please wait while we process your form.',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading() }
                    })

                    const success = await SendBusinessForm(project, startDate, endDate, address, car, driver, phone)

                    if (success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Form Submitted',
                            text: 'Your Official Business Form has been submitted successfully.',
                            confirmButtonColor: '#3085d6'
                        })
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Submission Failed',
                            text: 'Something went wrong. Please try again.',
                            confirmButtonColor: '#d33'
                        })
                    }
                }}>
                    <label className="block mb-1">Project</label>
                    <input
                        name="project"
                        type="text"
                        className="border p-2 rounded w-full mb-4"
                        placeholder="Enter Project Name"
                        value={project}
                        onChange={(e) => setProject(e.target.value)} required
                    />

                    <label className="block mb-1">Duration</label>
                    <div className="flex items-center gap-4 mb-4">
                        <input
                            type="date"
                            name="startDate"
                            className="border p-1 rounded"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            max={endDate}
                        />
                        <span>to</span>
                        <input
                            type="date"
                            name="endDate"
                            className="border p-1 rounded"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate?startDate:new Date().toISOString().split("T")[0]}
                            max={new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]} required
                        />
                    </div>

                    <label className="block mb-1">Location</label>
                    <input
                        type="text"
                        name="address"
                        className="border p-2 rounded w-full mb-4"
                        placeholder="Enter Place, City, & Province"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)} required
                    />

                    <label className="block mb-1">Company Car</label>
                    <input
                        type="text"
                        name="car"
                        className="border p-2 rounded w-full mb-4"
                        placeholder="Enter Car Name & License Plate"
                        value={car}
                        onChange={(e) => setCar(e.target.value)} required
                    />

                    <label className="block mb-1">Driver</label>
                    <input
                        type="text"
                        name="driver"
                        className="border p-2 rounded w-full mb-4"
                        placeholder="Enter Driver Name"
                        value={driver}
                        onChange={(e) => setDriver(e.target.value)} required
                    />

                    <label className="block mb-1">Contact No.</label>
                    <input
                        type="tel"
                        name="phone"
                        className="border p-2 rounded w-full mb-6"
                        placeholder="Enter Phone No."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)} required
                    />

                    <button type="submit" className="primary-btn">
                        Submit
                    </button>
                </form>
            </main>
        </DashboardLayout>
    )
}

export default OfficialBusinessFormPage