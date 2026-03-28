import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
    console.error("Supabase URL/service key missing.");
    process.exit(1);
}

const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.env.TEST_ADMIN_EMAIL ?? "admin2@conecteadvogados.local";
const password = process.env.TEST_ADMIN_PASSWORD ?? "Admin@123456";
const name = "Admin Teste Conecta";

const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: "ADMIN" },
    app_metadata: { role: "ADMIN" },
});

if (created.error) {
    console.error("createUser error:", created.error.message);
    process.exit(1);
}

const userId = created.data.user.id;

const userRow = await supabase
    .from("User")
    .upsert(
        {
            id: userId,
            email,
            name,
            phone: "+5511999999999",
            whatsappVerified: true,
            role: "ADMIN",
            plan: "PREMIUM",
        },
        { onConflict: "email" }
    )
    .select("id");

if (userRow.error) {
    console.error("upsert User error:", userRow.error.message);
    process.exit(1);
}

const sub = await supabase
    .from("Subscription")
    .upsert(
        {
            userId,
            provider: "internal",
            providerId: "internal-admin-test",
            status: "ACTIVE",
            plan: "PRIMUM",
        },
        { onConflict: "userId" }
    )
    .select("id");

if (sub.error) {
    console.error("upsert Subscription error:", sub.error.message);
    process.exit(1);
}

console.log("Admin de teste criado com sucesso.");
console.log(`email: ${email}`);
console.log(`senha: ${password}`);
