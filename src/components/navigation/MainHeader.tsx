"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, LogOut, Settings } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type MainHeaderProps = {
    className?: string;
    variant?: "dark" | "light" | "app";
    title?: string;
};

export function MainHeader({ className = "", variant = "dark", title }: MainHeaderProps) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const accountClasses = "bg-[#e8472a] text-white";

    const headerBase =
        variant === "app"
            ? "border-b border-[#3d2a5a] bg-[#170a2b]/90"
            : "bg-transparent";

    useEffect(() => {
        let isMounted = true;

        async function loadAuthState() {
            try {
                const supabase = createSupabaseBrowserClient();
                const [{ data: userData }, roleResponse] = await Promise.all([
                    supabase.auth.getUser(),
                    fetch("/api/auth/resolve-role", { method: "GET", cache: "no-store" }),
                ]);

                if (!isMounted) return;

                const roleJson = roleResponse.ok
                    ? ((await roleResponse.json()) as { success?: boolean; role?: string })
                    : null;

                const allowedRole = roleJson?.role === "LAWYER" || roleJson?.role === "ADMIN";
                setIsAuthenticated(Boolean(userData.user) && allowedRole);
            } catch {
                if (!isMounted) return;
                setIsAuthenticated(false);
            } finally {
                if (!isMounted) return;
                setIsLoadingAuth(false);
            }
        }

        void loadAuthState();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setIsMenuOpen(false);
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    async function handleSignOut() {
        setIsSigningOut(true);
        try {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
            document.cookie = "app_role=; Path=/; Max-Age=0; SameSite=Lax";
            setIsMenuOpen(false);
            setIsAuthenticated(false);
            router.push("/auth");
            router.refresh();
        } finally {
            setIsSigningOut(false);
        }
    }

    return (
        <header className={`relative z-20 ${headerBase} ${className}`.trim()}>
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                    <Link href="/" className="shrink-0">
                        <Image
                            src="/brand/conecta-logo.svg"
                            alt="Conecta Advogados"
                            width={150}
                            height={56}
                            style={{ height: "auto" }}
                            priority
                        />
                    </Link>
                    {title ? (
                        <div className="hidden rounded-full border border-[#3d2a5a] bg-[#231540]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2] sm:inline-flex">
                            {title}
                        </div>
                    ) : null}
                </div>

                <nav className="flex items-center gap-2 sm:gap-3">
                    {isLoadingAuth ? (
                        <span className="inline-flex h-10 min-w-28 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#120727]/70 px-4 text-xs font-semibold uppercase tracking-wide text-[#a89bc2]">
                            Carregando...
                        </span>
                    ) : isAuthenticated ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen((current) => !current)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#120727]/80 text-white transition hover:border-[#e8472a] hover:text-[#e8472a]"
                                aria-expanded={isMenuOpen}
                                aria-haspopup="menu"
                                aria-label="Abrir menu de perfil"
                            >
                                <CircleUserRound size={18} />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-[#3d2a5a] bg-[#1b0d33]/98 p-2 shadow-2xl backdrop-blur">
                                    <Link
                                        href="/conta"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white transition hover:bg-[#2d1b4e]"
                                    >
                                        <Settings size={16} /> Minha conta
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => void handleSignOut()}
                                        disabled={isSigningOut}
                                        className="mt-1 flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 disabled:opacity-60"
                                    >
                                        <LogOut size={16} /> {isSigningOut ? "Saindo..." : "Sair"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/auth?role=LAWYER"
                            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold uppercase tracking-wide shadow-[0_10px_24px_-12px_rgba(232,71,42,0.95)] transition hover:bg-[#c73d22] sm:px-5 sm:text-sm ${accountClasses}`}
                        >
                            Minha conta
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}