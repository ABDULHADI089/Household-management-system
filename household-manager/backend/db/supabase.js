require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend .env\n' +
    'Copy .env.example to .env and fill in your values.'
  );
}

// Service-role client — bypasses RLS, full access
const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

module.exports = supabase;
