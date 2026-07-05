# ObraFlow SaaS — Diário de Obras

Sistema SaaS de Registro Diário de Obras (RDO) para construtoras, empresas de engenharia, administradoras de obra e clientes/síndicos.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5 |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 5 |
| Autenticação | NextAuth.js v5 (Auth.js) |
| Validação | Zod 3 |
| Formulários | React Hook Form 7 |
| UI | Tailwind CSS 3 + shadcn/ui (Radix) |
| Storage | Cloudflare R2 (compatível S3) |
| PDF | @react-pdf/renderer |
| E-mail | Resend |
| Testes | Jest + Testing Library |
| E2E | Playwright |
| CI/CD | GitHub Actions |
| Deploy | Docker / Railway / Render |

---

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (para banco local)
- npm 9+

---

## Rodando localmente

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd diario-obras-saas
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Editar .env.local com seus valores
```

Variáveis obrigatórias para rodar local:

```env
DATABASE_URL="postgresql://dev:devpass@localhost:5432/diariobras?schema=public"
AUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Subir o banco de dados

```bash
docker-compose up -d
```

### 4. Aplicar migrations e gerar o Prisma client

```bash
npm run db:migrate    # cria e aplica migrations em dev
npm run db:generate   # gera o Prisma Client
```

### 5. Rodar o seed (dados demo)

```bash
npm run db:seed
```

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Credenciais demo (após rodar o seed)

| Perfil | E-mail | Senha |
|---|---|---|
| SUPER_ADMIN | superadmin@diariobras.com | SuperAdmin@2025 |
| ADMIN_EMPRESA | admin@construtora-demo.com | Admin@2025 |
| GESTOR_OBRA | gestor@construtora-demo.com | Gestor@2025 |
| COLABORADOR | colaborador@construtora-demo.com | Colab@2025 |
| CLIENTE_SINDICO | sindico@condominio-demo.com | Cliente@2025 |

> ⚠️ Credenciais apenas para desenvolvimento. Nunca commitar credenciais reais.

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/          # Login, recuperação de senha, aceite de convite
│   ├── (client)/        # Portal do cliente/síndico
│   ├── (dashboard)/     # Área administrativa
│   │   ├── obras/       # Listagem e detalhe de obras
│   │   ├── diarios/     # Diários de obra (RDO)
│   │   ├── relatorios/  # Relatórios PDF
│   │   ├── analise/     # Análise de dados
│   │   └── cadastros/   # Pré-cadastros e configurações
│   └── api/             # Route Handlers (API REST)
├── components/
│   ├── layout/          # AppLayout, Header (antigo), Sidebar (antigo)
│   ├── domain/          # Componentes de domínio (obra, diário, usuário...)
│   ├── pdf/             # Templates React-PDF
│   └── ui/              # Componentes base (shadcn/ui)
├── lib/                 # Utilitários, auth, db, s3, permissions...
└── types/               # TypeScript types e augmentações
```

---

## Comandos disponíveis

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run start            # Servidor de produção
npm run lint             # ESLint
npm run type-check       # TypeScript (tsc --noEmit)
npm test                 # Testes unitários (Jest)
npm run test:coverage    # Testes com cobertura
npm run test:e2e         # Testes E2E (Playwright)

npm run db:generate      # npx prisma generate
npm run db:migrate       # npx prisma migrate dev
npm run db:migrate:deploy # npx prisma migrate deploy (produção)
npm run db:studio        # Abrir Prisma Studio
npm run db:seed          # npx tsx prisma/seed.ts
npm run db:reset         # npx prisma migrate reset (CUIDADO: apaga dados)
```

---

## Fluxo de cadastro de obras

### Cadastro simples
Cria a obra rapidamente com os campos mínimos:
- Nome *
- Status *
- Grupo (opcional na API; obrigatório no formulário)
- Lista de tarefas (opcional)

A obra é criada como **incompleta** (`isProfileComplete = false`) e exibe o badge **"Cadastro incompleto"** na listagem.

### Cadastro completo
Preenche todos os dados de gestão:
- Nome, Status, Grupo *
- Responsável técnico *
- Data de início *
- Previsão de término *
- Tipo de contrato, Contratante, Nº do contrato
- CREA/CAU, ART/RRT, Área total
- Endereço (CEP, logradouro, bairro, cidade, UF)

A obra é marcada como **completa** (`isProfileComplete = true`) quando todos os campos essenciais estão preenchidos.

### Como completar um cadastro incompleto
1. Acessar a obra via listagem ou detalhe
2. Clicar em **"Completar cadastro"** ou **"Editar obra"**
3. Alterar para modo **Cadastro completo** e preencher os campos obrigatórios
4. Salvar — `isProfileComplete` é recalculado automaticamente

---

## Perfis de acesso (RBAC)

| Perfil | Acesso |
|---|---|
| `SUPER_ADMIN` | Acesso global a todos os tenants |
| `ADMIN_EMPRESA` | Gerencia empresa, usuários e obras |
| `GESTOR_OBRA` | Cria e gerencia diários em obras associadas |
| `COLABORADOR` | Registra atividades em obras associadas |
| `CLIENTE_SINDICO` | Acesso somente leitura a obras autorizadas |

- **Multitenancy:** todo acesso é isolado por `companyId`
- **RBAC no backend:** todas as APIs verificam permissão antes de qualquer operação
- **CLIENTE_SINDICO:** redirecionado para `/client` ao fazer login; bloqueado no backend de qualquer rota administrativa

---

## Grupos de obra

- Cada empresa tem seus grupos (`WorksiteGroup`)
- O seed cria um grupo padrão **"Geral"**
- No formulário de criação, o grupo é obrigatório
- Grupos não podem ser usados por outras empresas (validação no backend)

---

## Pré-cadastros

Disponíveis em **Cadastros** no menu:

| Categoria | Descrição |
|---|---|
| Mão de obra | Funções de trabalhadores |
| Equipamentos | Equipamentos usados nas obras |
| Tipos de ocorrências | Categorias de ocorrências |
| Checklist | Itens de verificação diária |
| Modelos de relatórios | Templates para geração de PDF |

Todos são isolados por empresa.

---

## Segurança

- Senhas com bcrypt (cost 12)
- Sessão JWT via cookies `HttpOnly/Secure/SameSite`
- Validação de entrada com Zod em todas as APIs
- `companyId` sempre extraído da sessão (nunca do body)
- Logs de auditoria para ações críticas
- Headers de segurança HTTP (HSTS, X-Frame-Options, CSP)
- CORS configurado
- Uploads validados por tipo MIME e tamanho

---

## Deploy

### Variáveis de ambiente de produção

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=<gerado com openssl rand -base64 32>
NEXTAUTH_URL=https://seu-dominio.com.br
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
RESEND_API_KEY=...
EMAIL_FROM=noreply@seu-dominio.com.br
```

### Docker

```bash
docker build -t obraflow .
docker run -p 3000:3000 --env-file .env obraflow
```

### Aplicar migrations em produção

```bash
npx prisma migrate deploy
```

### Checklist de produção

- [ ] `AUTH_SECRET` gerado com `openssl rand -base64 32`
- [ ] Banco PostgreSQL sem IP público
- [ ] Bucket R2/S3 com acesso público bloqueado
- [ ] Headers de segurança HTTP configurados
- [ ] HTTPS obrigatório
- [ ] Backup automático do banco configurado
- [ ] Monitoramento de uptime configurado
- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] `.env.local` e `.env` não commitados

---

## Rotas principais

| Rota | Descrição |
|---|---|
| `/login` | Login |
| `/obras` | Listagem de obras |
| `/obras/[id]` | Detalhe da obra |
| `/obras/[id]/editar` | Editar obra |
| `/diarios` | Listagem de diários |
| `/diarios/[id]` | Detalhe do diário |
| `/relatorios` | Geração de relatórios PDF |
| `/analise` | Análise de dados |
| `/cadastros/perfil` | Perfil do usuário |
| `/cadastros/empresa` | Dados da empresa |
| `/cadastros/usuarios` | Gestão de usuários |
| `/cadastros/grupos` | Grupos de obra |
| `/cadastros/mao-de-obra` | Pré-cadastro de funções |
| `/cadastros/equipamentos` | Pré-cadastro de equipamentos |
| `/cadastros/tipos-ocorrencia` | Pré-cadastro de tipos de ocorrências |
| `/cadastros/checklist` | Pré-cadastro de checklist |
| `/client` | Portal do cliente/síndico |

### Redirects de compatibilidade

| Rota antiga | Redireciona para |
|---|---|
| `/admin/usuarios` | `/cadastros/usuarios` |
| `/admin/empresa` | `/cadastros/empresa` |
| `/perfil` | `/cadastros/perfil` |
| `/obras/nova` | `/obras` (modal + ADICIONAR) |

---

## Testes

```bash
npm test                  # Todos os testes unitários
npm run test:coverage     # Com cobertura de código
```

### Testes existentes

- `src/__tests__/worksite-progressive.test.ts` — 34 testes cobrindo:
  - Cadastro simples (não exige campos de gestão)
  - Cadastro completo (exige campos essenciais)
  - Schema unificado da API
  - `calculateWorksiteProfileCompletion` com todos os casos de borda

---

## CI/CD

`.github/workflows/ci.yml`:
- **quality** — lint + type-check (sem banco)
- **test** — testes unitários (sem banco)
- **build** — migrations + build de produção (com PostgreSQL de serviço)

---

## Licença

Proprietário — ObraFlow SaaS © 2026
