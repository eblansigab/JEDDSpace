import { useEffect, useState } from "react";
import { formService } from "../services/formService";
import { alertService } from "../utils/alertService";
import DashboardLayout from "../layouts/dashboardLayout";
import { LoadingOverlay } from "../components";

export default function ManageleaveForm(){
    const [leaveForm,setLeaveForm] = useState([])
    const [loading,setLoading] = useState(true)

    useEffect(()=>{
        loadLeaveForm()
    },[])

    async function loadLeaveForm(){
        try{            
            const leaveForm = formService.getLeaveForm()
            setLeaveForm(leaveForm)
        } 
        catch(error) {
            await alertService.error("Failed to load leave forms")
            console.error(error.message)
        }
        finally {setLoading(false)}
    }

    if(loading){
        return(
            <DashboardLayout>
                <LoadingOverlay/>
            </DashboardLayout>
        )
    }


}