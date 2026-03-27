Você é um desenvolvedor sênior full-stack. Vou te passar o escopo completo de um projeto real 
chamado "Conecta Advogados". Quero que você construa a base completa do sistema seguindo 
rigorosamente as especificações abaixo.

---

## 🎨 DESIGN SYSTEM (baseado no layout de referência)

O design segue um tema escuro e sofisticado com os seguintes tokens:

### Cores (via Tailwind CSS — configurar em tailwind.config.ts)
- Background principal: #1a0a2e (roxo escuro profundo)
- Background secundário: #2d1b4e
- Accent primário: #e8472a (laranja-vermelho vibrante)
- Accent hover: #c73d22
- Texto principal: #ffffff
- Texto secundário: #a89bc2
- Borda sutil: #3d2a5a
- Card background: #231540

### Tipografia
- Font: Inter (Google Fonts)
- Títulos: font-bold uppercase tracking-wide
- Destaque no título: text-[#e8472a]

### Componentes visuais
- Botões CTA: bg-[#e8472a] rounded-full px-8 py-4 font-bold uppercase text-white 
  hover:bg-[#c73d22] transition-all
- Cards: bg-[#231540] rounded-2xl border border-[#3d2a5a] shadow-xl
- Logo: ícone de balança (⚖️) com fundo laranja rounded-lg
- Navbar: fundo transparente com blur, logo à esquerda, "Minha Conta" à direita
- Decoração de fundo: SVG com linhas curvas e pontos conectados em roxo-escuro 
  (estilo "grafo/rede")
- Hero section: foto centralizada com badge de ícone flutuante, título em dois tons 
  (branco + laranja), subtítulo em text-secondary, CTA button

---

## 🏗️ STACK TECNOLÓGICA (obrigatória)

- **Frontend:** Next.js 14+ com App Router + TypeScript
- **Estilização:** Tailwind CSS (design system acima via tailwind.config.ts)
- **Backend:** NextJS (API REST separada em /backend)
- **Banco de dados:** PostgreSQL via Supabase
- **Autenticação:** Supabase Auth (email/senha + magic link)
- **Pagamentos:** Plugável via interface PaymentProvider — implementar primeiro com Stripe,
  fácil de trocar (Asaas, Pagar.me, Mercado Pago) apenas mudando o adapter
- **ORM:** Prisma (conectado ao PostgreSQL do Supabase)
- **Hospedagem:** Vercel (frontend) + Supabase (backend/db)

---


## 🤖 ONBOARDING POR ROBÔ (prioridade alta)

Criar um fluxo de onboarding conversacional em `/onboarding` com as seguintes etapas:

### Visual do robô
- Avatar: círculo com ícone de robô (pode usar emoji 🤖 ou SVG simples)
- Balão de fala animado (fade-in por etapa)
- Barra de progresso no topo (ex: Etapa 2 de 5)
- Botões de resposta rápida (chips clicáveis) ou inputs conforme a etapa

### Etapas do fluxo
1. **Boas-vindas**
   - Robô: "Olá! Sou o assistente do Conecta Advogados 👋 Vou te ajudar a configurar 
     sua conta em poucos passos. Vamos começar?"
   - Opções: [Vamos lá!]

2. **Tipo de usuário**
   - Robô: "Você é um advogado buscando clientes ou um cliente buscando um advogado?"
   - Opções: [Sou Advogado] [Sou Cliente]

3. **Dados básicos** (form inline no balão)
   - Nome completo, email, telefone (WhatsApp)
   - Validação de WhatsApp: enviar código OTP via API

4. **Escolha do plano** (apenas para advogados)
   - Cards dos planos: Start / Pro / Primum
   - Design: cards lado a lado com destaque no Primum

5. **Área de atuação** (apenas para advogados)
   - Chips selecionáveis: Direito Civil, Trabalhista, Criminal, Família, Tributário, etc.

6. **Confirmação e criação de conta**
   - Robô: "Tudo certo! Criando sua conta..."
   - Loading animation → redirect para dashboard

### Comportamento
- Estado do robô gerenciado por `useOnboardingStore` (Zustand)
- Cada etapa salva no Supabase antes de avançar (evitar perda de dados)
- Mobile-first obrigatório

---

## 💳 SISTEMA DE PAGAMENTO PLUGÁVEL

Criar uma interface abstrata para fácil troca de provider:
```typescript
// lib/payment/PaymentProvider.interface.ts
export interface PaymentProvider {
  createSubscription(userId: string, planId: string): Promise<{ url: string }>
  cancelSubscription(subscriptionId: string): Promise<void>
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>
  createCheckout(data: CheckoutData): Promise<{ url: string }>
  handleWebhook(payload: any, signature: string): Promise<WebhookEvent>
}
```

- Implementar `StripeAdapter` como padrão
- Provider ativo definido por `PAYMENT_PROVIDER=stripe` no `.env`
- Estrutura permite adicionar `AsaasAdapter`, `PagarmeAdapter` sem alterar o resto do código

### Planos e valores
| Plano  | Tipo       | Valor     | Limite leads |
|--------|------------|-----------|--------------|
| Start  | Único      | Definir   | 8 contatos   |
| Pro    | Recorrente | Definir   | Ilimitado    |
| Premium | Recorrente | Definir   | Ilimitado + Dashboard |

---

## 🗄️ SCHEMA DO BANCO (Prisma + PostgreSQL)
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  phone         String
  whatsappVerified Boolean @default(false)
  role          Role     @default(CLIENT)
  plan          Plan     @default(START)
  planExpiresAt DateTime?
  createdAt     DateTime @default(now())
  leads         Lead[]
  subscription  Subscription?
}

model Lead {
  id          String   @id @default(uuid())
  name        String
  email       String
  phone       String
  whatsappVerified Boolean @default(false)
  area        String
  state       String
  status      LeadStatus @default(PENDING)
  createdAt   DateTime @default(now())
  unlocks     LeadUnlock[]
}

model LeadUnlock {
  id         String   @id @default(uuid())
  leadId     String
  userId     String
  unlockedAt DateTime @default(now())
  lead       Lead     @relation(fields: [leadId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  // Regra: max 2-3 escritórios por lead; após 48h sem atendimento, libera novamente
}

model Subscription {
  id             String   @id @default(uuid())
  userId         String   @unique
  provider       String   // "stripe" | "asaas" | "pagarme"
  providerId     String   // ID externo do provider
  status         SubStatus
  plan           Plan
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
}

enum Role { CLIENT LAWYER ADMIN }
enum Plan { START PRO PRIMUM }
enum LeadStatus { PENDING CONTACTED CONVERTED LOST }
enum SubStatus { ACTIVE CANCELED PAST_DUE }
```

---

## 📊 DASHBOARD (Plano Primum)

Página `/dashboard` com os seguintes widgets:
- Total de leads recebidos (card com número + trend)
- Leads desbloqueados (card)
- Taxa de conversão (%) — barra de progresso circular
- Histórico de contatos (tabela paginada)
- Desempenho mensal (LineChart — Recharts)
- Filtro por data range
- Filtro por atendente/vendedora

---

## 🛡️ ÁREA ADMINISTRATIVA `/admin`

Protegida por role ADMIN. Contém:
- Lista de usuários + plano + status
- Controle de leads (listar, editar status)
- Controle de desbloqueios
- Relatório de receita (por mês, por plano)
- Gerenciamento de permissões

---

## 🔐 SEGURANÇA E LGPD

- Supabase Auth para autenticação (JWT)
- Row Level Security (RLS) habilitado no Supabase
- Dados sensíveis criptografados
- Middleware Next.js para proteção de rotas por role
- LGPD: consentimento no cadastro, política de privacidade linkada

---

## 📱 PERFORMANCE E MOBILE

- Mobile-first em todos os componentes
- Alvo: 85+ no Google PageSpeed
- Imagens com next/image + lazy loading
- Fontes com next/font
- Skeleton loading em listas e dashboards

---

## 🔧 INTEGRAÇÕES DE MARKETING (estrutura pronta)

No `app/layout.tsx`, deixar espaço e comentários para:
```tsx
{/* META PIXEL — substituir pelo ID real */}
{/* GTM — substituir pelo container ID */}
{/* API de Conversões — configurar via env */}
```

---

## ✅ ORDEM DE IMPLEMENTAÇÃO SUGERIDA

1. Setup Next.js + Tailwind com design system completo
2. Landing page fiel ao design de referência (fundo roxo, hero, CTA laranja)
3. Fluxo de onboarding por robô (5 etapas)
4. Autenticação Supabase
5. Schema Prisma + migrations
6. CRM de leads (listagem, unlock, histórico)
7. Sistema de planos e pagamento (Stripe adapter)
8. Dashboard de métricas (Premium)
9. Área administrativa
10. Verificação WhatsApp
11. Testes e ajustes de performance
