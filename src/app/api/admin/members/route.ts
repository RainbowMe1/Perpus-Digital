import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const categories = ['student', 'teacher', 'staff'] as const;
type MemberCategory = (typeof categories)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Konfigurasi Supabase server belum lengkap.' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sesi login tidak valid. Silakan masuk kembali.' }, { status: 401 });
  }

  const { data: actor, error: actorError } = await userClient
    .from('profiles')
    .select('role, approval_status')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (actorError) {
    return NextResponse.json({ error: actorError.message }, { status: 500 });
  }
  if (!actor || actor.approval_status !== 'approved' || !['admin', 'librarian', 'staff'].includes(actor.role)) {
    return NextResponse.json({ error: 'Hanya staf perpustakaan yang dapat membuat akun anggota.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data formulir tidak valid.' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Data formulir tidak valid.' }, { status: 400 });
  }
  const { fullName, email, phone, category, classOrDepartment, password } = body;
  if (
    !requiredString(fullName, 200) ||
    !requiredString(email, 320) ||
    !requiredString(phone, 50) ||
    !requiredString(classOrDepartment, 200) ||
    typeof category !== 'string' ||
    !categories.includes(category as MemberCategory) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return NextResponse.json({
      error: 'Lengkapi semua data dengan benar. Kata sandi harus memiliki 8–128 karakter.',
    }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      member_category: category,
      class_or_department: classOrDepartment.trim(),
      phone: phone.trim(),
    },
  });
  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('approval_status')
    .eq('id', created.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(created.user.id);
    const detail = profileError?.message ?? 'Profil anggota tidak terbentuk.';
    return NextResponse.json({
      error: cleanupError
        ? `${detail} Akun juga gagal dibersihkan: ${cleanupError.message}`
        : detail,
    }, { status: 500 });
  }

  return NextResponse.json({
    id: created.user.id,
    approvalStatus: profile.approval_status,
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Konfigurasi Supabase server belum lengkap.' }, { status: 500 });
  }

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sesi login tidak valid. Silakan masuk kembali.' }, { status: 401 });
  }

  const { data: actor, error: actorError } = await userClient
    .from('profiles')
    .select('role, approval_status')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (actorError) {
    return NextResponse.json({ error: actorError.message }, { status: 500 });
  }
  if (
    !actor ||
    actor.approval_status !== 'approved' ||
    !['admin', 'librarian', 'teacher', 'staff'].includes(actor.role)
  ) {
    return NextResponse.json({ error: 'Akses tidak diizinkan untuk mengubah kata sandi anggota.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Data formulir tidak valid.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Data formulir tidak valid.' }, { status: 400 });
  }
  const { memberId, password } = body;
  if (
    typeof memberId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128
  ) {
    return NextResponse.json({ error: 'Pilih anggota dan gunakan kata sandi 8–128 karakter.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('user_id')
    .eq('id', memberId)
    .maybeSingle();
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
  if (!member?.user_id) {
    return NextResponse.json({ error: 'Anggota ini belum memiliki akun untuk diubah kata sandinya.' }, { status: 404 });
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(member.user_id, { password });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
