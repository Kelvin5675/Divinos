const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/user/Desktop/Proposta Divinos/PropostaDivinos/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data: rows, error: qErr } = await supabase.from('invitations').select('slug, title, bride_name, groom_name, couple_message, gallery_urls, cover_photo_url, music_url').order('created_at', { ascending: false }).limit(3);
    if(qErr) console.error(qErr);
    else {
        console.log("Recent invitations:");
        console.dir(rows, { depth: null });
    }
}
checkSchema();
