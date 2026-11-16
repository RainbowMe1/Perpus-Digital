import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.TEST_ACCOUNT_PASSWORD;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL belum diatur di .env.local.');
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY wajib diisi melalui prompt lokal.');
}
if (!password || password.length < 8) {
  throw new Error('Password tes wajib memiliki minimal 8 karakter.');
}

const accounts = [
  { email: 'edulibrary-test-admin@example.com', name: 'Admin Tes', category: 'student', role: 'admin' },
  { email: 'edulibrary-test-guru@example.com', name: 'Guru Tes', category: 'teacher', role: 'teacher' },
  { email: 'edulibrary-test-staf@example.com', name: 'Staf Tes', category: 'staff', role: 'staff' },
  { email: 'edulibrary-test-siswa@example.com', name: 'Siswa Tes', category: 'student', role: 'student' },
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExistingEmails() {
  const emails = new Set();
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email) emails.add(user.email.toLowerCase());
    }
    if (data.users.length < perPage) break;
  }

  return emails;
}

const existingEmails = await findExistingEmails();
const collisions = accounts
  .filter(account => existingEmails.has(account.email))
  .map(account => account.email);

if (collisions.length > 0) {
  throw new Error(
    `Tidak ada akun yang dibuat karena email ini sudah ada: ${collisions.join(', ')}. ` +
    'Skrip tidak mengubah akun yang sudah ada.'
  );
}

const createdUserIds = [];

try {
  for (const account of accounts) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: account.name,
        member_category: account.category,
        class_or_department: 'Akun Tes',
        phone: '-',
      },
    });
    if (error) throw error;
    createdUserIds.push(data.user.id);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: account.role, approval_status: 'approved' })
      .eq('id', data.user.id);
    if (profileError) throw profileError;

    console.log(`Dibuat: ${account.email} (${account.role})`);
  }

  console.log('\nSemua akun memakai password yang dimasukkan melalui prompt.');
} catch (error) {
  const cleanupErrors = [];
  for (const userId of createdUserIds.reverse()) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(userId);
    if (cleanupError) cleanupErrors.push(cleanupError.message);
  }
  if (cleanupErrors.length > 0) {
    console.error(`Pembersihan akun parsial gagal: ${cleanupErrors.join('; ')}`);
  }
  throw error;
}
