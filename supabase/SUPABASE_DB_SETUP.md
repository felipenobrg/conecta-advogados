# Supabase DB Setup (Onboarding)

Este projeto estava tentando conectar em `localhost:5432`, por isso o onboarding falhava em `db:transaction` com `DATABASE_CONNECTION_FAILED`.

Use este checklist para apontar o Prisma para o banco Supabase.

## 1) Variaveis obrigatorias no `.env`

```env
# Supabase HTTP
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Prisma/Postgres (use URL do Supabase)
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require&pgbouncer=true

# Fallback local (opcional)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/conecta?schema=public
```

Observacoes:
- `SUPABASE_DB_URL` e a URL prioritaria usada pelo Prisma neste projeto.
- Se usar Pooler do Supabase, mantenha `pgbouncer=true`.
- Se usar URL direta, remova `pgbouncer=true` e mantenha `sslmode=require`.

## 2) Validar conexao de banco

```bash
npx prisma generate
```

Se quiser validar com query simples:

```bash
node -e "const { Client } = require('pg'); const c = new Client({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL }); c.connect().then(()=>c.query('select now()')).then(r=>{console.log(r.rows[0]); return c.end();}).catch(e=>{console.error(e.message); process.exit(1);});"
```

## 3) Aplicar schema no banco Supabase

Use um dos comandos abaixo conforme seu fluxo:

```bash
npm run prisma:migrate
```

ou (se ja tiver migrations prontas no CI):

```bash
npx prisma migrate deploy
```

## 4) Tabela usada na validacao de sessao do onboarding

Garanta que `onboarding_steps` existe:

```sql
create table if not exists onboarding_steps (
  session_id text not null,
  step int not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, step)
);
```

## 5) Erros esperados e significado

- `DATABASE_CONNECTION_FAILED`: URL/host/porta/ssl do Postgres invalida ou banco inacessivel.
- `DATABASE_SCHEMA_MISMATCH`: schema Prisma e banco divergentes (migracoes pendentes).
- `ONBOARDING_SESSION_INVALID`: sessao sem progresso salvo em `onboarding_steps`.

## 6) Verificacao final do onboarding

1. Iniciar app: `npm run dev`
2. Preencher onboarding completo (advogado ou cliente)
3. Confirmar que nao retorna erro em `db:transaction`
4. Em caso de falha, use `traceId` retornado para buscar no log do servidor.
