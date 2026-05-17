import {createClient} from "@supabase/supabase-js"

const supabaseUrl='https://eoxjathcdzhvdnqifgny.supabase.co' 
const supabaseKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveGphdGhjZHpodmRucWlmZ255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzE4ODYsImV4cCI6MjA5MjcwNzg4Nn0.ud03HJF_ztTq8CXpcWiiewag3oYgZEADFKFRwg5Z494'

export const supabaseClient=createClient(
    supabaseUrl, supabaseKey
);
