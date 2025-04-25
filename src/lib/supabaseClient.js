import { createClient } from '@supabase/supabase-js';

// Supabase configuration with hardcoded values
const supabaseUrl = "https://mukwelacicyeuyvdxqgy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a3dlbGFjaWN5ZXV5dmR4cWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODg0NTEsImV4cCI6MjA1ODY2NDQ1MX0.x0ps-SKesT0bPRwKOVdacM0JnG8ZDRNz9ldLo5nr0gA";

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 