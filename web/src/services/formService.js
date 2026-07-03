import { supabaseClient } from "../supabase/supabaseClient";

export const formService = {
    async getBusinessForm() {
        const {data,error} = await supabaseClient.from('businessform').select("*")
        if (error) throw error
        return data
    },

    async getLeaveForm(){
        const {data,error} = await supabaseClient.from('leaveform').select("*")
        if (error) throw error
        return data
    },

    async getUserLeaveCredits(){
        const {data:{user}} = await supabaseClient.auth.getUser()
        const {data,error} = await supabaseClient.from("leavecredits").select("credits").eq("uuid",user.id)
        return data
    },

    async getLeaveCredits(id){
        const {data,error} = await supabaseClient.from("leavecredits").select("credits").eq("uuid",id)
        return data
    },

    async creditLeaveForm(id,credits,uid){
        const {data,error} = await supabaseClient.from("leaveform").update({"isCredited":true,}).eq("leaveform_id",id)
        const {} = await supabaseClient.from("leavecredits").update(credits-1).eq("uuid",uid)
    }
}
