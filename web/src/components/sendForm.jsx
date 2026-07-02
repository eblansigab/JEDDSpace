import { supabaseClient } from "../supabase/supabaseClient";

export async function SendBusinessForm(project,startDate,endDate,address,car,driver,phone){
    const {data,error} = await supabaseClient.from("businessform").insert({
        project_name:project,start_date:startDate,end_date:endDate,location:address,company_car:car,driver_name:driver,phone_num:phone
    })

    if(error) {
        console.error(error)
        return false
    }

    return true
}

export async function SendLeaveForm(startDate,endDate,type,reason){
    const {data:{user}} = await supabaseClient.auth.getUser()
    const {data,error} = await supabaseClient.from("leaveform").insert({
        start_date:startDate,end_date:endDate,type:type,reason:reason,created_by:user?.id
    })

    if(error){
        console.error(error)
        return false
    }
    return true
}
