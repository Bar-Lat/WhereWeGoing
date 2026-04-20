const { createClient } = require('@supabase/supabase-js');

// Dane połączenia pobierane są wyłącznie z backendowego .env.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Brak odpowiednich zmiennych środowiskowych.');
}

const supabaseAuthClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // Na backendzie nie utrzymujemy trwałej sesji użytkownika.
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Osobny klient do DB: nie używa metod auth, więc nie przejmie sesji użytkownika po signUp.
const supabaseDbClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = {
  supabaseAuthClient,
  supabaseDbClient,
};

