import Image from "next/image";
import Link from "next/link";

type MainHeaderProps = {
    className?: string;
    variant?: "dark" | "light";
};

export function MainHeader({ className = "", variant = "dark" }: MainHeaderProps) {
    const onboardingClasses =
        variant === "light"
            ? "border-slate-300/90 bg-white/70 text-slate-700 hover:bg-slate-100"
            : "border-[#3d2a5a] bg-[#231540]/90 text-white hover:bg-[#2d1b4e]";

    const accountClasses =
        variant === "light"
            ? "bg-[#e8472a] text-white"
            : "bg-[#e8472a] text-white";

    return (
        <header className={`relative z-20 ${className}`.trim()}>
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
                <Link href="/" className="shrink-0">
                    <Image
                        src="/brand/conecta-logo.svg"
                        alt="Conecta Advogados"
                        width={150}
                        height={56}
                        priority
                    />
                </Link>

                <nav className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/onboarding"
                        className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-bold uppercase tracking-wide transition sm:px-5 sm:text-sm ${onboardingClasses}`}
                    >
                        Onboarding
                    </Link>
                    <Link
                        href="/auth"
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold uppercase tracking-wide shadow-[0_10px_24px_-12px_rgba(232,71,42,0.95)] transition hover:bg-[#c73d22] sm:px-5 sm:text-sm ${accountClasses}`}
                    >
                        Minha Conta
                    </Link>
                </nav>
            </div>
        </header>
    );
}