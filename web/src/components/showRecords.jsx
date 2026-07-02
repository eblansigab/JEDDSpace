import { supabaseClient } from "../supabase/supabaseClient";
import React, { useEffect, useState } from "react";
import {Table,Button} from ".";

export function ShowRecords(){
    const [records,setRecords] = useState<any>([])
    useEffect(()=>{getRecords()},[])

    async function getRecords(){
        const {data:records} = await supabaseClient.from("file_hash").select("title,hash")
        setRecords(records)
        console.log(records)
    }

    const columns = [
        { key: "title" , title: "Document Title" },
        { key: "hash" , title: "Hash" , render: (value)=>(
            <span title={value}>{value.trim(0,6)}...{value.trim(-4)}</span>
        )},
        { key: "action" , title: "Action" ,  render:(_,row)=>(
            <Button variant="outline" onClick={() => { console.log(row); }} disabled={undefined} style={undefined}>Verify Hash</Button>
        )}
    ]


    return(
        <Table columns={columns} data={records} onRowClick={undefined}/>
    )
}