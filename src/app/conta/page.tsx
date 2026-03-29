"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";

type ProfilePayload = {
  success: boolean;
  profile?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "LAWYER" | "ADMIN";
    plan: "START" | "PRO" | "PREMIUM";
    officeName: string;
    officeLogoUrl: string;
    oabNumber: string;
    oabState: string;
  };
  message?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  officeName: string;
  officeLogoUrl: string;
  oabNumber: string;
  oabState: string;
};

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#4b3770] bg-[#120727] px-4 text-base text-white outline-none transition placeholder:text-[#8d7fa7] focus:border-[#e8472a] focus:ring-2 focus:ring-[#e8472a]/30";

const primaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#e8472a] px-5 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22] disabled:opacity-60";

const oabStates = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ContaPage() {
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: "",
    officeName: "",
    officeLogoUrl: "",
    oabNumber: "",
    oabState: "",
  });
  const [role, setRole] = useState<"LAWYER" | "ADMIN" | null>(null);
  const [plan, setPlan] = useState<"START" | "PRO" | "PREMIUM" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const isLawyer = role === "LAWYER";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/account/profile", { cache: "no-store" });
      const json = (await response.json().catch(() => null)) as ProfilePayload | null;

      if (!response.ok || !json?.success || !json.profile) {
        setStatusMessage(json?.message ?? "Nao foi possivel carregar seu perfil.");
        return;
      }

      const profile = json.profile;
      setRole(profile.role);
      setPlan(profile.plan);
      setForm({
        name: profile.name,
        email: profile.email,
        phone: formatWhatsapp(profile.phone),
        officeName: profile.officeName,
        officeLogoUrl: profile.officeLogoUrl,
        oabNumber: profile.oabNumber,
        oabState: profile.oabState,
      });
    } catch {
      setStatusMessage("Falha ao carregar seu perfil agora.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const subtitle = useMemo(() => {
    if (!role) return "Carregando perfil...";
    if (role === "ADMIN") return "Conta administrativa";
    return `Conta profissional - Plano ${plan ?? "-"}`;
  }, [plan, role]);

  function setField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          officeName: form.officeName,
          officeLogoUrl: form.officeLogoUrl,
          oabNumber: form.oabNumber,
          oabState: form.oabState,
        }),
      });

      const json = (await response.json().catch(() => null)) as ProfilePayload | null;
      if (!response.ok || !json?.success) {
        const firstIssue = json?.issues?.[0]?.message;
        setStatusMessage(firstIssue ?? json?.message ?? "Nao foi possivel salvar o perfil.");
        return;
      }

      setStatusMessage(json.message ?? "Perfil atualizado com sucesso.");
      await loadProfile();
    } catch {
      setStatusMessage("Falha inesperada ao salvar seu perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Minha conta" className="pb-10">
      <section className="mx-auto max-w-4xl">
        <header className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#1a0a2e] text-[#e8472a]">
              <UserRound size={18} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">Minha conta</h1>
              <p className="text-sm text-[#a89bc2]">{subtitle}</p>
            </div>
          </div>
        </header>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4 rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Nome</label>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Seu nome completo"
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Email</label>
              <input
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="seuemail@dominio.com"
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">WhatsApp</label>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(event) => setField("phone", formatWhatsapp(event.target.value))}
                placeholder="(11) 98765-4321"
                disabled={loading || saving}
              />
            </div>
          </div>

          {isLawyer && (
            <div className="grid gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Escritorio</label>
                <input
                  className={fieldClass}
                  value={form.officeName}
                  onChange={(event) => setField("officeName", event.target.value)}
                  placeholder="Nome do escritorio"
                  disabled={loading || saving}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Numero OAB</label>
                <input
                  className={fieldClass}
                  value={form.oabNumber}
                  onChange={(event) => setField("oabNumber", event.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="123456"
                  disabled={loading || saving}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">UF OAB</label>
                <select
                  className={fieldClass}
                  value={form.oabState}
                  onChange={(event) => setField("oabState", event.target.value.toUpperCase())}
                  disabled={loading || saving}
                >
                  <option value="">Selecione</option>
                  {oabStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">URL da logo (opcional)</label>
                <input
                  type="url"
                  className={fieldClass}
                  value={form.officeLogoUrl}
                  onChange={(event) => setField("officeLogoUrl", event.target.value)}
                  placeholder="https://site.com/logo.png"
                  disabled={loading || saving}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button type="submit" className={primaryButtonClass} disabled={loading || saving}>
              <Save size={16} /> {saving ? "Salvando..." : "Salvar alteracoes"}
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#140a28] px-5 text-xs font-bold uppercase tracking-[0.2em] text-[#a89bc2] transition hover:bg-[#2d1b4e] disabled:opacity-60"
              onClick={() => void loadProfile()}
              disabled={loading || saving}
            >
              Recarregar
            </button>
          </div>

          {statusMessage && (
            <p className="rounded-xl border border-[#3d2a5a] bg-[#1a0a2e]/70 px-4 py-3 text-sm text-[#ffd2c8]">
              {statusMessage}
            </p>
          )}
        </form>
      </section>
    </AppShell>
  );
}
