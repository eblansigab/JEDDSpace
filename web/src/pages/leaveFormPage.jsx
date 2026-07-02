import React, { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader } from '../components'
import { SendLeaveForm } from '../components/sendForm'
import Swal from "sweetalert2"

const LeaveFormPage = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [leaveType, setLeaveType] = useState('VL')
    const [reason, setReason] = useState('')
    const [minStartDate, setMinStartDate] = useState("")

    const twoWeeks = new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split("T")[0]
    const today = new Date().toISOString().split("T")[0]
    const threeMonths = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0]

    function determineStartDate(a) {
        if (a == "VL" || a == "OL") setMinStartDate(twoWeeks)
        else setMinStartDate(today)
    }

    useEffect(() => { determineStartDate(leaveType) }, [])

    async function handleSubmit(e) {
        e.preventDefault()

        // Step 1 — Confirmation
        const confirm = await Swal.fire({
            title: 'Submit Leave Form?',
            text: 'Are you sure you want to submit this Leave Form?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, submit it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#aaa'
        })

        if (!confirm.isConfirmed) return

        // Step 2 — Loading
        Swal.fire({
            title: 'Submitting...',
            text: 'Please wait while we process your leave form.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading() }
        })

        // Step 3 — Send to Supabase
        const success = await SendLeaveForm(startDate, endDate, leaveType, reason)

        // Step 4 — Result
        if (success) {
            Swal.fire({
                icon: 'success',
                title: 'Form Submitted',
                text: 'Your Leave Form has been submitted successfully.',
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
    }

    return (
        <DashboardLayout>
            <main className="content">
                <PageHeader title="Leave Form" />

                <form className="leave-form" onSubmit={handleSubmit}>
                    <label>Duration</label>
                    <div className="flex-initial gap-4" style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="date"
                            className="border p-1 rounded"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={minStartDate}
                            max={endDate} required
                        />
                        <span className="mx-2">to</span>
                        <input
                            type="date"
                            className="border p-1 rounded"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={minStartDate > startDate ? minStartDate : (startDate > today ? startDate : today)}
                            max={threeMonths} required
                        />
                    </div>

                    <label className="block mt-4">Type of Leave</label>
                    <select
                        className="border p-2 rounded w-full"
                        value={leaveType}
                        onChange={(e) => {
                            setLeaveType(e.target.value)
                            determineStartDate(e.target.value)
                            setStartDate("")
                            setEndDate("")
                        }} required>
                        <option value="VL">Vacation Leave (VL)</option>
                        <option value="SL">Sick Leave (SL)</option>
                        <option value="EL">Emergency Leave (EL)</option>
                        <option value="OL">Other (OL)</option>
                    </select>

                    <label className="block mt-4">Reason</label>
                    <textarea
                        rows="5"
                        className="border p-2 rounded w-full"
                        placeholder="Enter reason for leave"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    ></textarea>

                    <Button type="submit" variant="primary" style={{ marginTop: 24 }}>
                        Submit
                    </Button>
                </form>
            </main>
        </DashboardLayout>
    )
}

export default LeaveFormPage