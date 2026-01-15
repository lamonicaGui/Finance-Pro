
import { supabase } from './services/supabase';

async function debugProfiles() {
    console.log("Checking profiles table...");
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
    } else {
        console.log("Profiles count:", profiles?.length);
        console.log("Profiles data:", profiles);
    }

    console.log("Checking current session...");
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        console.log("Logged in as:", session.user.email);
        console.log("User ID:", session.user.id);
        console.log("User Metadata:", session.user.user_metadata);
    } else {
        console.log("No active session.");
    }
}

debugProfiles();
