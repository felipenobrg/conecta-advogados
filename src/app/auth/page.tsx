"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MainHeader } from "@/components/navigation/MainHeader";

type AppRole = "LAWYER" | "CLIENT" | "ADMIN";

type ResolveRoleResponse = {
    success: boolean;
    role?: AppRole;
};

function normalizeRole(role: unknown): AppRole {
    if (role === "LAWYER" || role === "ADMIN" || role === "CLIENT") {
        return role;
    }
    return "CLIENT";
}

function redirectPathForRole(role: AppRole) {
    if (role === "ADMIN") return "/admin";
    if (role === "LAWYER") return "/dashboard";
    return "/client/dashboard";
}

function setRoleCookie(role: AppRole) {
    document.cookie = `app_role=${role}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMagicLoading, setIsMagicLoading] = useState(false);

    const requestedRole = normalizeRole(searchParams.get("role"));
    const roleLabel = requestedRole === "LAWYER" ? "advogado" : "cliente";
    const displayMessage = message;

    function applyRoleAndRedirect(role: AppRole) {
        setRoleCookie(role);
        router.push(redirectPathForRole(role));
    }

    async function resolveRoleFromSession(): Promise<AppRole | null> {
        const response = await fetch("/api/auth/resolve-role", {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            return null;
        }

        const json = (await response.json()) as ResolveRoleResponse;
        if (!json.success || !json.role) {
            return null;
        }

        return json.role;
    }

    async function handleLogin() {
        setMessage("");
        setIsLoading(true);

        let supabase;
        try {
            supabase = createSupabaseBrowserClient();
        } catch {
            setIsLoading(false);
            setMessage("Supabase nao configurado neste ambiente.");
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setIsLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        const apiResolvedRole = await resolveRoleFromSession();
        const resolvedRole =
            apiResolvedRole ??
            normalizeRole(data.user?.user_metadata?.role ?? data.user?.app_metadata?.role);

        applyRoleAndRedirect(resolvedRole);
    }

    async function handleSendMagicLink() {
        if (!email) {
            setMessage("Informe um email valido para receber o magic link.");
            return;
        }

        setMessage("");
        setIsMagicLoading(true);

        let supabase;
        try {
            supabase = createSupabaseBrowserClient();
        } catch {
            setIsMagicLoading(false);
            setMessage("Supabase nao configurado neste ambiente.");
            return;
        }

        const emailRedirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo,
                shouldCreateUser: true,
            },
        });

        setIsMagicLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Magic link enviado. Verifique seu email para concluir o acesso.");
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!email || !password) {
            setMessage("Preencha email e senha.");
            return;
        }

        await handleLogin();
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2b0a46_0%,#130022_55%)] px-4 py-10 text-white">
            <MainHeader className="mb-3" />
            <section className="mx-auto w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
                <h1 className="text-2xl font-bold">Minha Conta</h1>
                <p className="mt-2 text-sm text-zinc-200">
                     Novos usuarios devem se cadastrar apenas pelo onboarding.
                </p>

                <form onSubmit={onSubmit} className="mt-5 space-y-3">
                    <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email"
                        type="email"
                        className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm outline-none placeholder:text-zinc-300 focus:border-[#ff453a]"
                    />
                    <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Senha"
                        type="password"
                        className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm outline-none placeholder:text-zinc-300 focus:border-[#ff453a]"
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff453a] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                        {isLoading ? "Processando..." : "Entrar"}
                    </button>

                    <button
                        type="button"
                        disabled={isMagicLoading}
                        onClick={handleSendMagicLink}
                        className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/30 bg-white/5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
                    >
                        {isMagicLoading ? "Enviando link..." : "Entrar com Magic Link"}
                    </button>
                </form>

                {displayMessage && <p className="mt-3 text-xs text-zinc-200">{displayMessage}</p>}

                <div className="mt-5 space-y-2 text-xs text-zinc-300">
                    <Link href="/onboarding" className="block font-semibold text-zinc-100 hover:text-white">
                        Nao tenho conta: cadastrar pelo onboarding
                    </Link>
                    <Link href="/" className="block font-semibold text-zinc-100 hover:text-white">
                        Voltar para a landing
                    </Link>
                </div>
            </section>
        </main>
    );
}