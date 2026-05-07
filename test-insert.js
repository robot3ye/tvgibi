const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  console.log("Attempting insert...");
  const { data, error } = await supabase.from('screen_club_messages').insert([
    { nickname: 'test', message: 'hello', is_emmy: false }
  ]).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
