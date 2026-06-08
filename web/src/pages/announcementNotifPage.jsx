import React, { useState, useEffect } from 'react'
import logo from '../assets/JEDDSpace Logo (Transparent).png'
import Sidebar from '../components/sideBar'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/dashboardLayout'

const GeneralAnnouncement = () => {

return (
    <DashboardLayout>
        <main className="content">
      <section className="dashboard-widget p-6 bg-white border rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-2">General Announcement</h3>
        <p className="text-gray-700">
          This is how a company-wide general announcement looks like.
        </p>
      </section>
            </main>
    </DashboardLayout>
)
}

export default GeneralAnnouncement