import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'admin@gmail.com';
  const password = 'admin123'; // Mesma senha antiga para facilitar

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Erro ao criar admin:', error.message);
  } else {
    console.log('Admin criado com sucesso! E-mail:', email);
  }
}

main();
