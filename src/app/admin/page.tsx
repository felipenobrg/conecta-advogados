const users = [
  { name: "Ana Moura", plan: "PRIMUM", status: "ACTIVE" },
  { name: "Pedro Lima", plan: "PRO", status: "PAST_DUE" },
  { name: "Julia Costa", plan: "START", status: "ACTIVE" },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-6xl space-y-4">
        <header>
          <h1 className="text-xl font-bold text-slate-900">Painel Admin</h1>
          <p className="text-sm text-slate-600">Gestao inicial de usuarios, leads e receita.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Receita mensal</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">R$ 18.240</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Usuarios ativos</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">247</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Leads pendentes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">53</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Desbloqueios hoje</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">31</p>
          </article>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Usuarios</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {users.map((user) => (
              <li key={user.name} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                <span className="font-medium text-slate-800">{user.name}</span>
                <span className="text-slate-600">{user.plan}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{user.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
