"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, House, LayoutDashboard, Settings, Users } from "lucide-react";
import { MainHeader } from "@/components/navigation/MainHeader";

const navItems = [
    { label: "Inicio", href: "/", icon: House },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Conta", href: "/conta", icon: Settings }
];

type AppShellProps = {
    children: React.ReactNode;
    title?: string;
    showSidebar?: boolean;
    fullBleed?: boolean;
    className?: string;
};

export function AppShell({
    children,
    title,
    showSidebar = true,
    fullBleed = false,
    className = "",
}: AppShellProps) {
    const pathname = usePathname();
    const desktopGridClass = showSidebar ? "lg:grid-cols-[250px_1fr]" : "grid-cols-1";
    const bottomPaddingClass = showSidebar ? "pb-24" : "pb-10";
    const containerClass = fullBleed
        ? `w-full gap-4 px-4 ${bottomPaddingClass} sm:px-6 ${desktopGridClass}`
        : `mx-auto w-full max-w-7xl gap-4 px-4 ${bottomPaddingClass} sm:px-6 ${desktopGridClass}`;

    return (
        <div className="relative min-h-screen bg-[#0f071c] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(232,71,42,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(96,58,151,0.35),transparent_45%),linear-gradient(180deg,#120021,rgba(16,6,30,0.9))]" />
            <div className="relative z-10">
                <MainHeader variant="app" title={title} />
                <div className={`grid ${containerClass}`.trim()}>
                    {showSidebar ? (
                        <aside className="hidden rounded-3xl border border-[#3d2a5a] bg-[#1b0d33]/90 p-4 shadow-xl backdrop-blur lg:sticky lg:top-23 lg:block lg:h-[calc(100vh-112px)] lg:overflow-y-auto">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">
                                Navegacao
                            </p>
                            <nav className="mt-3 flex flex-col gap-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${isActive
                                                ? "border-[#e8472a] bg-linear-to-r from-[#e8472a] to-[#d63f25] text-white shadow-[0_12px_28px_-14px_rgba(232,71,42,0.9)]"
                                                : "border-[#3d2a5a] bg-[#231540]/70 text-[#a89bc2] hover:-translate-y-px hover:bg-[#2d1b4e] hover:text-white"
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Icon size={16} />
                                                {item.label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </aside>
                    ) : null}

                    <main className={`min-h-[calc(100vh-96px)] ${className}`.trim()}>
                        {children}
                    </main>
                </div>

                {showSidebar ? (
                    <nav className="fixed inset-x-4 bottom-4 z-30 grid grid-cols-4 gap-2 rounded-2xl border border-[#3d2a5a] bg-[#1b0d33]/95 p-2 shadow-2xl backdrop-blur lg:hidden">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex h-12 flex-col items-center justify-center rounded-xl text-[10px] font-semibold uppercase tracking-wide transition ${isActive
                                        ? "bg-[#e8472a] text-white"
                                        : "text-[#a89bc2] hover:bg-[#2d1b4e] hover:text-white"
                                        }`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                ) : null}
            </div>
        </div>
    );
}
