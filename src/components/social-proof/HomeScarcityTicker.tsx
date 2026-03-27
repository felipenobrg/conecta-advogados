"use client";

import { useEffect, useMemo, useState } from "react";

type ScarcityItem = {
  id: string;
  displayName: string;
  area: string;
  state: string;
  requestedAt: string;
};

type ScarcityResponse = {
  success: boolean;
  totalRequests: number;
  windowDays: number;
  items: ScarcityItem[];
};

function formatCompactTotal(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatTimeAgo(input: string) {
  const requestedAt = new Date(input).getTime();
  const now = Date.now();
  const diffInMinutes = Math.max(1, Math.floor((now - requestedAt) / 60000));

  if (diffInMinutes < 60) return `${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} h`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} d`;
}

export function HomeScarcityTicker() {
  const [data, setData] = useState<ScarcityResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadScarcity() {
      const response = await fetch("/api/public/scarcity", {
        cache: "no-store",
      });

      if (!response.ok) {
        if (isMounted) {
          setData({
            success: false,
            totalRequests: 0,
            windowDays: 30,
            items: [],
          });
        }
        return;
      }

      const payload = (await response.json()) as ScarcityResponse;
      if (isMounted) {
        setData(payload);
      }
    }

    void loadScarcity();

    return () => {
      isMounted = false;
    };
  }, []);

  const loopItems = useMemo(() => {
    const items = data?.items ?? [];
    return [...items, ...items];
  }, [data?.items]);

  const hasItems = (data?.items.length ?? 0) > 0;

  return (
    <section className="relative mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8">
      <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/88 p-4 shadow-xl backdrop-blur sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
            Solicitações em andamento agora
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a89bc2]">
            + de {formatCompactTotal(data?.totalRequests ?? 0)} pessoas solicitando orçamento conosco
          </p>
        </div>

        {!data && (
          <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/80 px-4 py-3 text-sm text-[#a89bc2]">
            Carregando solicitações reais...
          </div>
        )}

        {data && !hasItems && (
          <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/80 px-4 py-3 text-sm text-[#a89bc2]">
            Novas solicitações serão exibidas em instantes.
          </div>
        )}

        {hasItems && (
          <div className="overflow-hidden">
            <div className="scarcity-track flex w-max gap-3 py-1">
              {loopItems.map((item, index) => (
                <article
                  key={`${item.id}-${index}`}
                  className="min-w-[280px] rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-3 shadow-[0_10px_30px_-16px_rgba(232,71,42,0.6)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full border border-[#3d2a5a] bg-[#2d1b4e] text-sm font-bold text-white">
                      {item.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-white">
                        {item.displayName} - {item.state}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e8472a]">
                        Procurando {item.area}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[#a89bc2]">Solicitado há {formatTimeAgo(item.requestedAt)}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
