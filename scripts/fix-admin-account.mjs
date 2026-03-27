import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
    console.error("Supabase URL/service key missing.");
    process.exit(1);
}

const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const email = "admin@conecteadvogados.local";
const password = "Admin@123456";
const name = "Admin Fake Conecta";

const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (list.error) {
    console.error("listUsers error:", list.error.message);
    process.exit(1);
}

let userId;
const existing = list.data.users.find((user) => user.email === email);

if (existing) {
    userId = existing.id;
    const update = await admin.auth.admin.updateUserById(existing.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: "ADMIN" },
        app_metadata: { role: "ADMIN" },
    });

    if (update.error) {
        console.error("updateUser error:", update.error.message);
        process.exit(1);
    }

    console.log("Admin auth user updated:", userId);
} else {
    const created = await admin.auth.admin.createUser({
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

    userId = created.data.user.id;
    console.log("Admin auth user created:", userId);
}

const userRow = await admin
    .from("User")
    .upsert(
        {
            id: userId,
            email,
            name,
            phone: "+5511999999999",
            whatsappVerified: true,
            role: "ADMIN",
            plan: "PRIMUM",
        },
        { onConflict: "email" }
    )
    .select("id");

if (userRow.error) {
    console.error("upsert User error:", userRow.error.message);
    process.exit(1);
}

const sub = await admin
    .from("Subscription")
    .upsert(
        {
            userId,
            provider: "internal",
            providerId: "internal-admin-seed",
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

console.log("Admin app rows upserted.");
