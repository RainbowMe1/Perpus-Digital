$serviceRoleSecure = Read-Host "Supabase service_role key (tidak akan ditampilkan)" -AsSecureString
$passwordSecure = Read-Host "Password bersama akun tes (minimal 8 karakter)" -AsSecureString
$exitCode = 1

try {
  $env:SUPABASE_SERVICE_ROLE_KEY = (New-Object System.Net.NetworkCredential("", $serviceRoleSecure)).Password
  $env:TEST_ACCOUNT_PASSWORD = (New-Object System.Net.NetworkCredential("", $passwordSecure)).Password

  node scripts/create-test-accounts.mjs
  $exitCode = $LASTEXITCODE
}
finally {
  Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\TEST_ACCOUNT_PASSWORD -ErrorAction SilentlyContinue
}

exit $exitCode
