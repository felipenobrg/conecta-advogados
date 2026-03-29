"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
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
    return "/leads/inscricao";
}

function setRoleCookie(role: AppRole) {
    document.cookie = `app_role=${role}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

function AuthPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const requestedRole = normalizeRole(searchParams.get("role"));
    const nextPath = searchParams.get("next");
    const requestedRoleLabel = requestedRole === "LAWYER" ? "advogado" : requestedRole === "ADMIN" ? "administrador" : "cliente";
    const displayMessage = message;

    function applyRoleAndRedirect(role: AppRole) {
        setRoleCookie(role);

        if (nextPath && nextPath.startsWith("/")) {
            router.push(nextPath);
            return;
        }

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
            setMessage("Supabase não configurado neste ambiente.");
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

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!email || !password) {
            setMessage("Preencha e-mail e senha.");
            return;
        }

        await handleLogin();
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#4d145e_0%,#210537_40%,#120022_70%)] px-4 py-8 text-white sm:py-10">
            <MainHeader className="mb-3" />
            <section className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <article className="relative overflow-hidden rounded-3xl border border-[#3d2a5a] bg-[linear-gradient(160deg,rgba(35,12,58,0.95),rgba(20,8,37,0.96))] p-5 shadow-2xl backdrop-blur sm:p-6">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#ff453a]/20 blur-3xl" />
                    <p className="inline-flex items-center gap-2 rounded-full border border-[#ff453a]/35 bg-[#ff453a]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffc6bf]">
                        <Sparkles size={12} /> Acesso Profissional
                    </p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-wide text-white">
                        Área do
                        <span className="block text-[#ff453a]">advogado</span>
                    </h1>
                    <p className="mt-3 max-w-md text-sm leading-6 text-[#d8cde9]">
                        Entre para visualizar leads bloqueados, liberar contatos qualificados e acompanhar a evolução do seu funil.
                    </p>

                    <div className="mt-5 space-y-2">
                        <div className="rounded-2xl border border-[#3d2a5a] bg-[#120727]/75 p-3 text-sm text-[#d8cde9]">
                            <p className="inline-flex items-center gap-2 font-semibold text-white">
                                <ShieldCheck size={16} className="text-[#ff453a]" /> Segurança de conta
                            </p>
                            <p className="mt-1 text-xs text-[#a89bc2]">Acesso solicitado para perfil: {requestedRoleLabel}.</p>
                        </div>
                        <div className="rounded-2xl border border-[#3d2a5a] bg-[#120727]/75 p-3 text-xs text-[#a89bc2]">
                            Novos usuários devem se cadastrar pelo onboarding para garantir validação correta dos dados.
                        </div>
                    </div>
                </article>

                <article className="rounded-3xl border border-[#3d2a5a] bg-[#1b0d33]/90 p-5 shadow-2xl backdrop-blur sm:p-6">
                    <h2 className="text-xl font-black uppercase tracking-wide text-white">Minha conta</h2>
                    <p className="mt-1 text-sm text-[#cfc1e4]">Faça login com e-mail e senha.</p>

                    <form onSubmit={onSubmit} className="mt-5 space-y-3">
                    <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="E-mail"
                        type="email"
                        className="h-12 w-full rounded-2xl border border-[#4b3770] bg-[#120727] px-4 text-sm text-white outline-none placeholder:text-[#8d7fa7] focus:border-[#ff453a]"
                    />
                    <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Senha"
                        type="password"
                        className="h-12 w-full rounded-2xl border border-[#4b3770] bg-[#120727] px-4 text-sm text-white outline-none placeholder:text-[#8d7fa7] focus:border-[#ff453a]"
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff453a] text-sm font-black uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                        <LockKeyhole size={16} /> {isLoading ? "Processando..." : "Entrar na conta"}
                    </button>
                </form>

                    {displayMessage && (
                        <p className="mt-3 rounded-xl border border-[#3d2a5a] bg-[#120727]/75 px-3 py-2 text-xs text-[#ffd2c8]">
                            {displayMessage}
                        </p>
                    )}

                    <div className="mt-5 space-y-2 text-xs text-[#cfc1e4]">
                        <Link href="/onboarding?role=LAWYER" className="block font-semibold text-zinc-100 hover:text-white">
                            Não tenho conta: cadastrar como advogado
                        </Link>
                        <Link href="/leads/inscricao" className="block font-semibold text-zinc-100 hover:text-white">
                            Quero apenas enviar meu caso (sem conta)
                        </Link>
                        <Link href="/" className="block font-semibold text-zinc-100 hover:text-white">
                            Voltar para a landing
                        </Link>
                    </div>
                </article>
            </section>
        </main>
    );
}

export default function AuthPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2b0a46_0%,#130022_55%)] px-4 py-10 text-white">
                    <MainHeader className="mb-3" />
                    <section className="mx-auto w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
                        <p className="text-sm text-zinc-200">Carregando autenticação...</p>
                    </section>
                </main>
            }
        >
            <AuthPageContent />
        </Suspense>
    );
}