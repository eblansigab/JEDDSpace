import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import Sidebar from '../components/sideBar'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/dashboardLayout'

const OfficialBusinessFormPage = () => {

return (
<div>
  <DashboardLayout/>
  <div className="layout">
    <Sidebar/>
    <main className="content">
      <h1>Official Business Form</h1>

      <form className="business-form" onSubmit={(e) => e.preventDefault()}>
        <label className="block mb-1">Project</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Project Name" 
        />

        <label className="block mb-1">Duration</label>
        <div className="flex items-center gap-4 mb-4">
          <input type="date" className="border p-1 rounded" />
          <span>to</span>
          <input type="date" className="border p-1 rounded" />
        </div>

        <label className="block mb-1">Location</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Place, City, & Province" 
        />

        <label className="block mb-1">Company Car</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Car Name & License Plate" 
        />

        <label className="block mb-1">Driver</label>
        <input 
          type="text" 
          className="border p-2 rounded w-full mb-4" 
          placeholder="Enter Driver Name" 
        />

        <label className="block mb-1">Contact No.</label>
        <input 
          type="tel" 
          className="border p-2 rounded w-full mb-6" 
          placeholder="Enter Phone No." 
        />

        <button type="submit" className="primary-btn">
          Submit
        </button>
      </form>
    </main>
  </div>
</div>
)
}

export default OfficialBusinessFormPage;