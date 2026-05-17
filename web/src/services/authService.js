import { supabaseClient } from '../supabase/supabaseClient';

export const registerUser = async(
    email,
    password,
    confirmPassword,
    firstName,
    lastName,
    position,
    department
) => {
     if(password !== confirmPassword){
            alert("Password do not match!")
            return; 
        }

    const {data, error} = 
        await supabaseClient.auth.signUp({
            email, password
        });
    
    if (error) throw error

    const {error: insertError} = await supabaseClient
        .from('employee')
        .insert([
            {
                first_name: firstName,
                last_name: lastName,
                position,
                department,
                user_id: data.user.id
            }
        ]);

        if (insertError) throw insertError
        
        return data

        alert("Registration Succesfull!")
        window.location.href = "/register"
        return data;
};

export const loginUser = async (email, password) => {
    const {data, error} = await supabaseClient.auth.signInWithPassword({
        email, password,
    });
    if(error) throw error;

    alert("Login Successfully!")
    window.location.href="/dashboard";
    return data;
}

export const logoutUser = async () => {
    const {error} = await supabaseClient.auth.signOut();
    if(error) throw error;

    alert("Logged out Successfull!");
    window.location.href = "/login";
};

