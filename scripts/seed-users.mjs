// Seed script: Create test users (ADMIN + STAR) via Supabase Admin API + PostgREST
// No external dependencies needed — uses native fetch only.
const SUPABASE_URL = "https://vxyzqymlnqxlcbqbrvip.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eXpxeW1sbnF4bGNicWJydmlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU5NjkxMCwiZXhwIjoyMDg0MTcyOTEwfQ.HTwshrK7Bss-e5rRnWOJQutHM0O6obF5c86yea50bLA";

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const testUsers = [
  {
    email: "admin@hamkkebom.com",
    password: "Admin1234!",
    name: "관리자",
    role: "ADMIN",
    phone: "010-1111-1111",
    baseRate: 0,
  },
  {
    email: "star1@gmail.com",
    password: "Test1234!",
    name: "스타1",
    role: "STAR",
    phone: "010-2222-2222",
    baseRate: 50000,
  },
];

function cuid() {
  return "c" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function main() {
  // 1. List existing auth users
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?per_page=50`,
    { headers }
  );
  const listData = await listRes.json();
  const existingAuthUsers = listData.users || [];
  console.log(`Found ${existingAuthUsers.length} existing auth users`);

  for (const u of testUsers) {
    console.log(`\n--- Creating ${u.role}: ${u.email} ---`);

    // Delete existing auth user if found
    const existing = existingAuthUsers.find((x) => x.email === u.email);
    if (existing) {
      console.log(`  Deleting existing auth user: ${existing.id}`);
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
        method: "DELETE",
        headers,
      });
    }

    // 2. Create Supabase Auth user
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, phone: u.phone, role: u.role },
      }),
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      console.error(`  Auth error:`, authData);
      continue;
    }

    const authId = authData.id;
    console.log(`  Auth user created: ${authId}`);

    // 3. Delete existing DB user with this authId (if any)
    // Prisma uses camelCase column names (authId, not auth_id)
    await fetch(
      `${SUPABASE_URL}/rest/v1/users?authId=eq.${authId}`,
      { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } }
    );

    // 4. Insert Prisma User record via PostgREST
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        id: cuid(),
        authId: authId,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        baseRate: u.baseRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    const dbData = await dbRes.json();
    if (!dbRes.ok) {
      console.error(`  DB error:`, dbData);
    } else {
      console.log(`  DB user created: id=${dbData[0]?.id}, role=${dbData[0]?.role}`);
    }
  }

  console.log("\n✅ Seed complete!");
  console.log("\nTest accounts:");
  console.log("  ADMIN: admin@hamkkebom.com / Admin1234!");
  console.log("  STAR:  star1@gmail.com / Test1234!");
}

main().catch(console.error);
