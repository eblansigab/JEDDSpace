import { useEffect, useState } from "react";
import { formService } from "../services/formService";
import { alertService } from "../utils/alertService";
import DashboardLayout from "../layouts/dashboardLayout";
import { LoadingOverlay } from "../components";

export default function ManageBusinessForm(){
    const [businessForm,setBusinessForm] = useState([])
    const [loading,setLoading] = useState(true)

    useEffect(()=>{
        loadBusinessForm()
    },[])

    async function loadBusinessForm(){
        try{            
            const businessForm = formService.getBusinessForm()
            setBusinessForm(businessForm)
        } 
        catch(error) {
            await alertService.error("Failed to load business forms")
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