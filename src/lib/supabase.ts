import { createClient } from '@supabase/supabase-js';

// Configuration provided for eOSIS Supabase Database
export const SUPABASE_URL = 'https://uyyagxxaamnschocajpe.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eWFneHhhYW1uc2Nob2NhanBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTI3MDIsImV4cCI6MjEwODM4ODcwMn0.Sk8TvehBFqyzNATi6oB70vwM0IxfiPUo7VeFJUcLpUo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
