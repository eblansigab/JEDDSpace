import { supabaseClient } from "../supabase/supabaseClient";
import React, { useEffect, useState, useMemo } from "react";
import {Table,Button,PageHeader,SearchBar} from "../components";
import {verifyHash} from "../components/contract"
import Swal from "sweetalert2";


export function ShowRecords(){
    const [records,setRecords] = useState([])
    const [searchTerm, setSearchTerm] = useState()
    useEffect(()=>{getRecords()},[])

    async function getRecords(){
        const {data:records} = await supabaseClient.from("file_hash").select("filename,hash,transaction_hash")
        setRecords(records)
    }


    const filteredRecords = useMemo(() =>
          records.filter((record) =>
            [record.filename, record.hash, record.transaction_hash]
              .map((value) => value || '')
              .join(' ')
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          ),[searchTerm]) 






    async function checkHash(hash) {
        Swal.fire({
            title: 'Verifying...',
            text: 'Checking hash against blockchain',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading()
            }
        })
    
        // Simulate a delay to test the loading state
        await new Promise((resolve) => setTimeout(resolve, 1000))
    
        // Checks the blockchain for the hash (does not consume gas)
        const isMatch = verifyHash(hash)
    
        if (isMatch) {
            Swal.fire({
                icon: 'success',
                title: 'Hash Verified',
                text: 'This document is authentic and has not been tampered with.',
                confirmButtonColor: '#3085d6'
            })
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: 'This document hash does not match any on-chain record.',
                confirmButtonColor: '#d33'
            })

        }
    }














    
    const columns = [
        { key: "filename" , title: "Document Title" },
        { key: "hash" , title: "Hash" , render: (value)=>(
            <span title={value}>{value.slice(0,6)}...{value.slice(-4)}</span>
        )},
        { key: "transaction_hash" , title: "Transaction Hash", render: (value)=>(
            <span title={value}>{value.slice(0,6)}...{value.slice(-4)}</span>
        )},
        { key: "action" , title: "Action" ,  render:(_,row)=>(
            <Button variant="outline" onClick={() => { checkHash(row.hash); }} disabled={undefined} style={undefined}>Verify Hash</Button>
        )}
    ]


    return(
        <main className="content">
            <PageHeader
            title="Verify Blockchain Records"
            actions={[
            <SearchBar key="search" value={searchTerm} onChange={setSearchTerm} placeholder="Search records by ID or hash..." />,
            <Button key="refresh" variant="outline" onClick={() => setSearchTerm('')}>
                Clear
            </Button>
            ]}
            />
            <Table columns={columns} data={records} onRowClick={undefined}/>
        </main>
    )
}