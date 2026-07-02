# Arquitetura — Diário de Obras SaaS

**Versão:** 1.0.0  
**Data:** 2025  

---

## Sumário

1. [Diagrama de Arquitetura](#1-diagrama-de-arquitetura)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Fluxo de Autenticação](#4-fluxo-de-autenticação)
5. [Fluxo de Multitenancy](#5-fluxo-de-multitenancy)
6. [Fluxo de Upload de Arquivos](#6-fluxo-de-upload-de-arquivos)
7. [Decisões de Design](#7-decisões-de-design)
8. [Padrões Utilizados](#8-padrões-utilizados)
9. [Escalabilidade e Limites do MVP](#9-escalabilidade-e-limites-do-mvp)

---

## 1. Diagrama de Arquitetura

```
┌────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                    │
│              React + Next.js App Router (RSC)               │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼──────────────────────────────────┐
│                   CDN / Edge (Cloudflare)                   │
│              Cache de assets estáticos, WAF                 │
└─────────────────────────┬──────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────┐
│               Next.js Server (Node.js)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  App Router                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ Server Comps │  │ Route Handler│ ← API Interna   │   │
│  │  │  (RSC)       │  │  (API REST)  │                 │   │
│  │  └──────────────┘  └──────────────┘                 │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  Middleware (auth.ts)                         │   │   │
│  │  │  - Valida JWT                                 │   │   │
│  │  │  - Injeta companyId no contexto               │   │   │
│  │  │  - Rate limiting                              │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└──────┬────────────────────────────────────────┬────────────┘
       │                                        │
┌──────▼────────┐                    ┌──────────▼──────────┐
│  PostgreSQL   │                    │  Cloudflare R2      │
│  (Gerenciado) │                    │  (Object Storage)   │
│               │                    │  Fotos, PDFs, Docs  │
│  Prisma ORM   │                    └─────────────────────┘
└───────────────┘
       │
┌──────▼────────┐    ┌───────────────────┐
│  Redis Cache  │    │  Resend / SMTP     │
│  (Sessões,    │    │  (E-mails)         │
│   Rate Limit) │    └───────────────────┘
└───────────────┘
```

### Componentes Externos

```
┌─────────────────────────────────────────────────────┐
│                 Serviços de Suporte                  │
│                                                      │
│  ┌──────────────┐   ┌──────────────────────────┐    │
│  │   Sentry     │   │   Uptime Robot / BetterUp │    │
│  │  (Erros)     │   │   (Monitoramento)         │    │
│  └──────────────┘   └──────────────────────────┘    │
│                                                      │
│  ┌──────────────┐   ┌──────────────────────────┐    │
│  │  Logtail /   │   │   GitHub Actions          │    │
│  │  Axiom       │   │   (CI/CD)                 │    │
│  │  (Logs)      │   └──────────────────────────┘    │
│  └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológica

### 2.1 Frontend e Backend

| Tecnologia | Versão | Justificativa |
|---|---|---|
| **Next.js** | 14+ | App Router com RSC reduz bundle client-side; API Routes elimina servidor separado no MVP |
| **React** | 18+ | Ecosystem maduro; Server Components para SEO e performance |
| **TypeScript** | 5+ | Type safety reduz bugs em runtime; melhor DX |
| **Tailwind CSS** | 3+ | Utility-first; produtividade alta; bundle pequeno via purge |
| **shadcn/ui** | latest | Componentes acessíveis (Radix UI) sem lock-in; copia código para o projeto |
| **React Hook Form** | 7+ | Formulários performáticos com validação integrada via Zod |
| **Zod** | 3+ | Validação de schema compartilhada entre front e back |
| **TanStack Query** | 5+ | Cache, refetch, optimistic updates para dados server-side |

### 2.2 Persistência

| Tecnologia | Versão | Justificativa |
|---|---|---|
| **PostgreSQL** | 16+ | ACID, JSONB, RLS nativo, ecosistema maduro |
| **Prisma ORM** | 5+ | Type-safe queries; migrations; geração automática de tipos |
| **Redis** | 7+ | Cache de sessão, rate limiting, filas de jobs (BullMQ futuro) |

### 2.3 Autenticação

| Tecnologia | Versão | Justificativa |
|---|---|---|
| **Auth.js (NextAuth)** | v5 | Integração nativa Next.js; suporte a Credentials, OAuth; session via JWT |
| **bcrypt** | — | Hashing de senha seguro com cost factor configurável |
| **jsonwebtoken** | — | JWT para tokens de API e convites |

### 2.4 Storage e Mídia

| Tecnologia | Justificativa |
|---|---|
| **Cloudflare R2** | S3-compatible; sem egress fee; CDN Cloudflare integrado |
| **AWS S3** (alternativa) | Fallback; mais madura; custo com egress |
| **@aws-sdk/client-s3** | SDK oficial; funciona com R2 via endpoint customizado |
| **sharp** | Otimização de imagens server-side antes do upload |

### 2.5 Geração de PDF

| Tecnologia | Justificativa |
|---|---|
| **@react-pdf/renderer** | Renderiza React como PDF; sem dependência de browser |
| **Puppeteer** (alternativa) | HTML → PDF com fidelidade alta; mais pesado; para uso em worker |

### 2.6 E-mail

| Tecnologia | Justificativa |
|---|---|
| **Resend** | API moderna, SDK TypeScript nativo, React Email para templates |
| **React Email** | Templates de e-mail como componentes React |

### 2.7 Infraestrutura e DevOps

| Tecnologia | Justificativa |
|---|---|
| **Railway** | Deploy simplificado; PostgreSQL + Redis gerenciados; boa DX |
| **Docker** | Containerização para consistência entre ambientes |
| **GitHub Actions** | CI/CD nativo; gratuito para repos públicos |
| **Sentry** | Monitoramento de erros em produção |

---

## 3. Estrutura de Pastas

```
diario-obras-saas/
│
├── docs/                          # Documentação técnica
│   ├── spec.md
│   ├── architecture.md
│   ├── api.md
│   ├── data-model.md
│   ├── security-lgpd.md
│   ├── deployment.md
│   └── tasks.md
│
├── prisma/
│   ├── schema.prisma              # Definição do schema
│   ├── seed.ts                    # Dados de seed para desenvolvimento
│   └── migrations/                # Migrations geradas
│
├── public/
│   ├── favicon.ico
│   └── logo.svg
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/                # Route group: páginas públicas
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/           # Route group: app autenticado
│   │   │   ├── layout.tsx         # Layout com sidebar + header
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   │
│   │   │   ├── admin/             # Área administrativa
│   │   │   │   ├── empresa/
│   │   │   │   ├── usuarios/
│   │   │   │   └── plano/
│   │   │   │
│   │   │   ├── obras/             # Gestão de obras
│   │   │   │   ├── page.tsx       # Lista de obras
│   │   │   │   ├── nova/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx   # Detalhe da obra
│   │   │   │       ├── equipe/
│   │   │   │       └── diarios/
│   │   │   │
│   │   │   ├── diarios/           # Diários de obra
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── editar/
│   │   │   │
│   │   │   └── relatorios/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (client)/              # Portal do cliente/síndico
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── obras/
│   │   │   │   └── [id]/
│   │   │   └── relatorios/
│   │   │
│   │   └── api/                   # Route Handlers (API REST)
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── companies/
│   │       │   └── route.ts
│   │       ├── users/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       ├── worksites/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── users/
│   │       ├── daily-logs/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── activities/
│   │       │       ├── labor/
│   │       │       ├── materials/
│   │       │       ├── occurrences/
│   │       │       ├── photos/
│   │       │       ├── attachments/
│   │       │       ├── comments/
│   │       │       ├── submit/
│   │       │       └── approve/
│   │       ├── reports/
│   │       │   └── route.ts
│   │       └── uploads/
│   │           └── presigned/
│   │               └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   └── domain/                # Componentes de domínio
│   │       ├── daily-log/
│   │       │   ├── DailyLogCard.tsx
│   │       │   ├── DailyLogForm.tsx
│   │       │   └── DailyLogStatus.tsx
│   │       ├── worksite/
│   │       ├── photo/
│   │       └── report/
│   │
│   ├── lib/
│   │   ├── auth.ts                # Configuração Auth.js
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── s3.ts                  # AWS SDK / R2 client
│   │   ├── email.ts               # Resend client
│   │   ├── pdf.ts                 # React-PDF helpers
│   │   ├── audit.ts               # Helper de auditoria
│   │   ├── permissions.ts         # Lógica de autorização
│   │   └── validations/           # Schemas Zod por entidade
│   │       ├── worksite.ts
│   │       ├── daily-log.ts
│   │       └── user.ts
│   │
│   ├── hooks/
│   │   ├── useCurrentUser.ts
│   │   ├── useDailyLog.ts
│   │   └── useWorksite.ts
│   │
│   ├── types/
│   │   ├── index.ts               # Re-exports gerais
│   │   └── next-auth.d.ts         # Augmentação do NextAuth
│   │
│   └── middleware.ts              # Middleware global Next.js
│
├── .env.example                   # Template de variáveis de ambiente
├── .env.local                     # Variáveis locais (gitignore)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── docker-compose.yml             # PostgreSQL + Redis local
└── Dockerfile                     # Produção
```

---

## 4. Fluxo de Autenticação

```
Usuário                 Next.js               Auth.js             PostgreSQL
   │                       │                     │                     │
   │── POST /login ────────►│                     │                     │
   │   {email, password}    │── signIn() ─────────►│                     │
   │                        │                     │── SELECT user ──────►│
   │                        │                     │◄── user row ─────────│
   │                        │                     │── bcrypt.compare()   │
   │                        │                     │── gera JWT ──────────│
   │                        │◄── session JWT ──────│                     │
   │◄── Set-Cookie: ─────────│                     │                     │
   │    session (HttpOnly)  │                     │                     │
   │                        │                     │                     │
   │── GET /dashboard ──────►│                     │                     │
   │                        │── middleware.ts      │                     │
   │                        │   verifica JWT       │                     │
   │                        │   injeta companyId   │                     │
   │◄── 200 dashboard ───────│                     │                     │
```

### Token Structure (JWT)

```json
{
  "sub": "user-uuid",
  "email": "user@empresa.com",
  "name": "João Silva",
  "role": "GESTOR_OBRA",
  "companyId": "company-uuid",
  "companySlug": "construtora-xyz",
  "iat": 1700000000,
  "exp": 1700000900
}
```

---

## 5. Fluxo de Multitenancy

```
Request HTTP
     │
     ▼
middleware.ts
     │
     ├── Extrai JWT do cookie de sessão
     ├── Verifica assinatura JWT
     ├── Extrai companyId do JWT
     └── Injeta no request context
           │
           ▼
     Route Handler / Server Component
           │
           ├── Recebe companyId do contexto
           ├── Passa para todas as queries Prisma
           └── WHERE companyId = :companyId
                     │
                     ▼
               PostgreSQL (dados isolados por tenant)
```

### Exemplo de Query com Tenant Guard

```typescript
// lib/db-helpers.ts
export async function getWorksite(worksiteId: string, companyId: string) {
  const worksite = await prisma.worksite.findFirst({
    where: {
      id: worksiteId,
      companyId: companyId, // tenant guard obrigatório
    },
  });
  if (!worksite) throw new NotFoundError('Obra não encontrada');
  return worksite;
}
```

---

## 6. Fluxo de Upload de Arquivos

```
Cliente                  Next.js API              R2 / S3
   │                         │                        │
   │── POST /api/uploads/ ───►│                        │
   │   {fileName, mimeType}   │                        │
   │                          │── Valida permissão     │
   │                          │── Gera storageKey      │
   │                          │── getSignedUrl() ──────►│
   │                          │◄── presignedUrl ────────│
   │◄── { presignedUrl, key } ─│                        │
   │                          │                        │
   │── PUT presignedUrl ───────────────────────────────►│
   │   (arquivo binário)      │                     Upload direto
   │◄── 200 OK ────────────────────────────────────────│
   │                          │                        │
   │── POST /api/daily-logs/  │                        │
   │   /{id}/photos           │                        │
   │   { storageKey, ... }   ►│                        │
   │                          │── Salva Attachment     │
   │                          │── no banco com key     │
   │◄── 201 Created ───────────│                        │
```

---

## 7. Decisões de Design

### 7.1 Por que Next.js full-stack (sem backend separado)?

No MVP, manter um único serviço reduz: complexidade de deploy, custo de infraestrutura, overhead de CORS e necessidade de times separados. À medida que o produto cresce, as Route Handlers podem ser migradas para microserviços sem mudar a interface pública.

**Tradeoff aceito:** Funções serverless têm cold start (~200ms); resolvido com keep-alive e instâncias mínimas configuradas no provedor.

### 7.2 Por que Row-Level multitenancy (vs. schema-per-tenant)?

- **Schema-per-tenant:** melhor isolamento, mas migrations paralelas são complexas e o número de schemas cresce linearmente com tenants
- **RLS lógico via companyId:** mais simples, migrations únicas, testado em escala por produtos como Linear e Notion

**Mitigação:** Testes automatizados de cross-tenant leak em cada PR.

### 7.3 Por que Prisma ORM?

- Tipagem automática dos modelos direto do schema
- Migrations com rollback
- Query builder type-safe sem escrita de SQL manual
- Prisma Studio para inspeção em desenvolvimento

**Limitação:** N+1 queries em relations — mitigado com `include` explícito e DataLoader onde necessário.

### 7.4 Por que Cloudflare R2?

- Zero egress fee (diferencial vs. S3)
- Compatível com S3 SDK (troca trivial se necessário)
- CDN Cloudflare integrado para servir assets públicos

---

## 8. Padrões Utilizados

### 8.1 Repository Pattern (simplificado)

Queries de banco encapsuladas em funções em `lib/`, não diretamente nos Route Handlers.

```typescript
// lib/worksites.ts
export async function listWorksites(companyId: string, filters: WorksiteFilters) {
  return prisma.worksite.findMany({ where: { companyId, ...filters } });
}
```

### 8.2 Result Pattern para erros de domínio

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string; code: number };
```

### 8.3 Zod para validação de entrada

Todo input de API é parseado com `schema.safeParse()` antes de atingir a lógica de negócio. Erros de validação retornam 422 com detalhes estruturados.

### 8.4 Server Actions vs Route Handlers

- **Server Actions:** mutations simples de formulário (criar/editar entidades)
- **Route Handlers:** operações que precisam de controle de headers, streaming, ou uso por clientes externos

### 8.5 Error Boundary e Suspense

Cada segmento de rota tem `error.tsx` e `loading.tsx` para degradação graciosa.

---

## 9. Escalabilidade e Limites do MVP

| Aspecto | Limite MVP | Caminho de Escala |
|---|---|---|
| Tenants | ~500 | Sharding por companyId |
| Usuários por tenant | ~100 | Pool de conexões + réplica de leitura |
| Fotos por diário | 50 | Sem limite técnico (R2 escala) |
| PDF geração | Síncrono | Migrar para worker assíncrono (BullMQ) |
| Conexões DB | Pool de 20 | PgBouncer em frente ao PostgreSQL |
| Requests/s | ~200 RPS | Horizontal scaling no Railway/Render |

O design foi escolhido para funcionar sem mudanças estruturais até ~10.000 usuários ativos mensais.
