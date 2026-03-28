# Conecta Advogados

Base inicial da plataforma em Next.js com onboarding conversacional por robo, pagamentos plugaveis e estrutura para Supabase + Prisma.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Zustand (estado do onboarding)
- Prisma + PostgreSQL (Supabase)
- Supabase Auth / APIs
- Stripe (adapter padrao)

## Primeiros passos

1. Copie `.env.example` para `.env` e configure as chaves.
2. Instale dependencias:

```bash
npm install
```

3. Rode as migrations:

```bash
npm run prisma:migrate
```

4. Rode o app:

```bash
npm run dev
```

## Rotas iniciais

- `/` landing page
- `/onboarding` fluxo conversacional mobile-first
- `/dashboard` dashboard essencial do plano Premium
- `/admin` area administrativa essencial

## Implementado neste inicio

- Fluxo visual do robo com:
	- avatar
	- baloes animados por etapa
	- barra de progresso
	- chips e formularios inline
- Persistencia por etapa do onboarding em API (`/api/onboarding/step`)
- Finalizacao de onboarding com criacao/atualizacao de usuario e assinatura (`/api/onboarding/complete`)
- OTP via API para WhatsApp:
	- `POST /api/whatsapp/send-otp`
	- `POST /api/whatsapp/verify-otp`
- Regra de desbloqueio de leads com limite de 3 escritorios e janela adicional de 48h (`POST /api/leads/unlock`)
- Webhook Stripe para sincronizacao de assinaturas e bloqueio por inadimplencia (`POST /api/webhooks/stripe`)
- Interface abstrata de pagamento (`PaymentProvider`) e `StripeAdapter`
- Schema Prisma com entidades User, Lead, LeadUnlock, Subscription e enums
- Middleware de protecao por role para `/dashboard` e `/admin`

## Tabela Supabase esperada para onboarding

Crie a tabela `onboarding_steps` no Supabase para salvar cada etapa:

```sql
create table if not exists onboarding_steps (
	session_id text not null,
	step int not null,
	payload jsonb not null,
	updated_at timestamptz not null default now(),
	primary key (session_id, step)
);
```

## Proximos blocos

- Integrar Supabase Auth completo no onboarding
- Ligar checkout Stripe ao plano selecionado
- Implementar RLS e criptografia de dados sensiveis
- Conectar dashboard/admin a dados reais do banco
