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
      : "border-white/30 bg-white/10 text-white hover:bg-white/20";

  const accountClasses =
    variant === "light"
      ? "bg-[#ff453a] text-white"
      : "bg-[#ff453a] text-white";

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
            className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-semibold transition sm:px-5 sm:text-sm ${onboardingClasses}`}
          >
            Onboarding
          </Link>
          <Link
            href="/auth"
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-semibold shadow-[0_10px_24px_-12px_rgba(255,69,58,0.95)] transition hover:brightness-110 sm:px-5 sm:text-sm ${accountClasses}`}
          >
            Minha Conta
          </Link>
        </nav>
      </div>
    </header>
  );
}