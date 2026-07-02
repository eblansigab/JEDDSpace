import React, { useMemo, useState } from 'react'
import Sidebar from '../components/sideBar'
import DashboardLayout from '../layouts/dashboardLayout'
import { Button, PageHeader, SearchBar, StatusBadge, Table } from '../components'
import { ShowRecords } from '../components/showRecords'




const AuditBlockchainPage = () => {

/*  
  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        [record.id, record.hash, record.time, record.status]
          .map((value) => value || '')
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [searchTerm]
  )


  const columns = [
    { key: 'id', title: 'Record ID' },
    {
      key: 'hash',
      title: 'Transaction Hash',
      render: (value) => value
    },
    { key: 'time', title: 'Timestamp' },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <Button variant="outline" onClick={() => {console.log(row.id)}}>
          View Details
        </Button>
      )
    }
  ]

*/

  return (
    <DashboardLayout>

          <ShowRecords/>

    </DashboardLayout>
  )
}

export default AuditBlockchainPage;
