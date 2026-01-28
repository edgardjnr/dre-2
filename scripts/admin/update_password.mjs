import { createClient } from '@supabase/supabase-js';

/**
 * Usage:
 * node scripts/admin/update_password.mjs --url <SUPABASE_URL> --key <SERVICE_ROLE_KEY> --email <EMAIL> --password <NEW_PASSWORD>
 */

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
};

const url = getArg('url');
const serviceRoleKey = getArg('key');
const targetEmail = getArg('email');
const newPassword = getArg('password');

if (!url || !serviceRoleKey || !targetEmail || !newPassword) {
  console.error('Parâmetros insuficientes. Use: --url --key --email --password');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function findUserByEmail(email) {
  // Paginar usuários até encontrar o email
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null; // última página
    page += 1;
  }
}

async function run() {
  try {
    const user = await findUserByEmail(targetEmail);
    if (!user) {
      console.error(`Usuário não encontrado: ${targetEmail}`);
      process.exit(2);
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) {
      console.error(`Falha ao atualizar senha: ${error.message || error}`);
      process.exit(3);
    }
    console.log(`Senha atualizada com sucesso para ${targetEmail}`);
  } catch (err) {
    console.error(`Erro: ${err.message || err}`);
    process.exit(4);
  }
}

run();
