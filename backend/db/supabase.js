const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, ''); // removes trailing slash if any

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;