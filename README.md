# ObraFlow SaaS — Diário de Obras

Sistema SaaS para criação, gestão e acompanhamento de Registros Diários de Obras (RDO), desenvolvido para construtoras, empresas de engenharia, administradoras de obras e clientes/síndicos.

> **Status:** MVP em desenvolvimento e hardening de segurança.  
> O projeto ainda não está liberado para uso em produção com dados reais.

---

## Visão geral

O ObraFlow centraliza informações operacionais e gerenciais das obras, permitindo:

- gestão de empresas, usuários e permissões;
- cadastro simples e completo de obras;
- criação e aprovação de registros diários;
- registro de atividades, ocorrências, mão de obra e materiais;
- envio de fotos e anexos;
- comentários nos diários;
- portal específico para cliente/síndico;
- geração de relatórios em PDF;
- histórico e filtros;
- logs de auditoria;
- isolamento de dados por empresa;
- monitoramento de erros e desempenho com Sentry.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15.5.18 — App Router |
| Interface | React 19 |
| Linguagem | TypeScript 5 |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 5 |
| Autenticação | Auth.js / NextAuth.js v5 |
| Validação | Zod 3 |
| Formulários | React Hook Form 7 |
| UI | Tailwind CSS 3 + shadcn/ui + Radix UI |
| Storage | Cloudflare R2 — compatível com S3 |
| PDF | `@react-pdf/renderer` |
| E-mail | Resend |
| Monitoramento | Sentry |
| Testes unitários | Jest + Testing Library |
| Testes E2E | Playwright |
| Qualidade | ESLint 9 + TypeScript |
| CI/CD | GitHub Actions |
| Containerização | Docker |
| Deploy planejado | Railway, Render ou infraestrutura equivalente |

---

## Arquitetura local

Durante o desenvolvimento, os componentes funcionam da seguinte forma:

```text
Navegador
    ↓
Next.js — npm run dev
    ↓
Prisma Client
    ↓
PostgreSQL no Docker
```

Serviços locais iniciados pelo Docker Compose:

```text
PostgreSQL → banco de dados da aplicação
Redis      → infraestrutura para cache e rate limiting
```

O Prisma faz parte da aplicação. Ele não é um servidor independente: sua função é permitir que o código TypeScript consulte e atualize o PostgreSQL.

---

## Pré-requisitos

- Node.js 20 ou superior;
- npm 9 ou superior;
- Docker Desktop;
- Docker Compose;
- Git.

Verifique as versões instaladas:

```bash
node --version
npm --version
docker --version
docker compose version
```

---

## Rodando localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/alicemavila/obraflow-saas.git
cd obraflow-saas
```

Caso o projeto esteja dentro da pasta `diario-obras-saas`:

```bash
cd diario-obras-saas
```

### 2. Instalar as dependências

```bash
npm install
```

Para instalações reproduzíveis em CI ou após excluir `node_modules`:

```bash
npm ci
```

---

## Variáveis de ambiente

O projeto utiliza arquivos diferentes para evitar duplicações e separar responsabilidades.

### `.env`

Utilizado principalmente pelo Prisma CLI e pelos scripts de banco.

Exemplo:

```env
DATABASE_URL="postgresql://dev:devpass@localhost:5432/diariobras?schema=public"
```

### `.env.local`

Contém as configurações locais da aplicação Next.js:

- autenticação;
- URL da aplicação;
- Sentry;
- Cloudflare R2;
- Resend;
- limites de upload;
- configurações de rate limiting.

Exemplo mínimo:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Diário de Obras"

AUTH_SECRET="gere-uma-chave-segura"
NEXTAUTH_URL=http://localhost:3000

NEXT_PUBLIC_SENTRY_DSN="https://SEU_DSN_DO_SENTRY"
```

Para gerar um `AUTH_SECRET` local:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### `.env.example`

Modelo público contendo os nomes das variáveis necessárias, sem credenciais reais.

### `.env.sentry-build-plugin`

Criado pelo assistente do Sentry e utilizado para armazenar o token de envio dos source maps.

Esse arquivo contém informação sensível e deve permanecer no `.gitignore`.

### Arquivos que nunca devem ser commitados

```text
.env
.env.local
.env.sentry-build-plugin
```

O `.env.example` deve permanecer versionado.

---

## Subindo a infraestrutura local

Inicie PostgreSQL e Redis:

```bash
docker compose up -d
```

Verifique o estado dos containers:

```bash
docker compose ps
```

Para acompanhar os logs:

```bash
docker compose logs -f
```

Para desligar os serviços:

```bash
docker compose down
```

Para desligar e apagar também os volumes locais:

```bash
docker compose down -v
```

> O comando com `-v` apaga os dados persistidos no PostgreSQL local.

---

## Prisma e banco de dados

### Gerar o Prisma Client

```bash
npm run db:generate
```

Equivalente a:

```bash
npx prisma generate
```

Esse comando:

- lê o `prisma/schema.prisma`;
- gera o Prisma Client;
- não cria tabelas;
- normalmente não precisa do Docker ligado.

### Criar ou aplicar migrations em desenvolvimento

```bash
npm run db:migrate
```

Equivalente a:

```bash
npx prisma migrate dev
```

O PostgreSQL precisa estar rodando.

### Aplicar migrations existentes

```bash
npm run db:migrate:deploy
```

Equivalente a:

```bash
npx prisma migrate deploy
```

Esse é o comando indicado para CI, homologação e produção.

### Abrir o Prisma Studio

```bash
npm run db:studio
```

O Prisma Studio permite visualizar e editar dados localmente em uma interface web.

### Executar o seed

```bash
npm run db:seed
```

O seed cria dados iniciais para desenvolvimento e demonstração.

> O seed atual é destinado somente ao ambiente local. Antes da produção, ele deve ser protegido contra execução acidental, ter as senhas fixas removidas e exigir autorização explícita.

### Resetar o banco local

```bash
npm run db:reset
```

> Esse comando apaga todos os dados do banco configurado na `DATABASE_URL`.

---

## Iniciar a aplicação

Com o PostgreSQL rodando:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Fluxo local recomendado:

```bash
docker compose up -d
npm run db:generate
npm run dev
```

Em um banco novo:

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Estrutura principal

```text
src/
├── app/
│   ├── (auth)/                  # Login, recuperação de senha e convite
│   ├── (client)/                # Portal do cliente/síndico
│   ├── (dashboard)/             # Área administrativa
│   │   ├── obras/
│   │   ├── diarios/
│   │   ├── relatorios/
│   │   ├── analise/
│   │   └── cadastros/
│   ├── api/                     # Route Handlers
│   └── global-error.tsx         # Captura global de erros com Sentry
├── components/
│   ├── layout/
│   ├── domain/
│   ├── pdf/
│   └── ui/
├── hooks/
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── permissions.ts
│   ├── audit.ts
│   ├── s3.ts
│   └── pdf.ts
├── types/
├── instrumentation.ts           # Inicialização do Sentry no servidor
├── instrumentation-client.ts    # Inicialização do Sentry no navegador
└── middleware.ts

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

.github/
└── workflows/
    └── ci.yml

sentry.server.config.ts
sentry.edge.config.ts
next.config.mjs
Dockerfile
docker-compose.yml
```

---

## Comandos disponíveis

```bash
npm run dev                 # Servidor de desenvolvimento
npm run build               # Build de produção
npm run start               # Servidor de produção

npm run lint                # ESLint
npm run type-check          # TypeScript — tsc --noEmit

npm test                    # Testes unitários
npm run test:coverage       # Testes com cobertura
npm run test:e2e            # Testes E2E com Playwright

npm run db:generate         # Gerar Prisma Client
npm run db:migrate          # Criar/aplicar migration em desenvolvimento
npm run db:migrate:deploy   # Aplicar migrations existentes
npm run db:studio           # Abrir Prisma Studio
npm run db:seed             # Inserir dados locais
npm run db:reset            # Resetar banco local
```

---

## Fluxo de cadastro de obras

### Cadastro simples

Permite criar rapidamente uma obra com os campos mínimos:

- nome;
- status;
- grupo;
- lista de tarefas opcional.

A obra é criada com:

```text
isProfileComplete = false
```

Na interface, ela recebe o indicador:

```text
Cadastro incompleto
```

### Cadastro completo

Permite preencher dados administrativos, técnicos e contratuais:

- nome;
- status;
- grupo;
- responsável técnico;
- data de início;
- previsão de término;
- contratante;
- tipo e número do contrato;
- CREA/CAU;
- ART/RRT;
- área total;
- CEP;
- logradouro;
- bairro;
- cidade;
- estado.

Quando os campos obrigatórios estão preenchidos:

```text
isProfileComplete = true
```

### Completar uma obra

1. Acessar a obra pela listagem;
2. clicar em **Completar cadastro** ou **Editar obra**;
3. selecionar o modo de cadastro completo;
4. preencher os campos obrigatórios;
5. salvar.

O backend recalcula o status do cadastro.

---

## Perfis de acesso

| Perfil | Responsabilidade |
|---|---|
| `SUPER_ADMIN` | Administração global do SaaS |
| `ADMIN_EMPRESA` | Gestão da empresa, usuários e obras |
| `GESTOR_OBRA` | Gestão operacional das obras associadas |
| `COLABORADOR` | Registro de atividades nas obras associadas |
| `CLIENTE_SINDICO` | Visualização autorizada do andamento da obra |

### Multitenancy

A arquitetura utiliza `companyId` para separar dados de empresas diferentes.

O sistema também possui associações entre usuários e obras por meio de `WorksiteUser`.

> O hardening das autorizações está em andamento. A centralização das verificações de tenant, perfil e associação por obra é uma prioridade antes da liberação para produção.

---

## Grupos de obra

- Cada empresa possui seus próprios grupos;
- grupos são isolados por `companyId`;
- o formulário de criação exige a seleção de um grupo;
- uma empresa não deve utilizar grupos pertencentes a outro tenant.

Modelo relacionado:

```text
WorksiteGroup
```

---

## Pré-cadastros

Disponíveis na área de cadastros:

| Categoria | Finalidade |
|---|---|
| Mão de obra | Funções e categorias de trabalhadores |
| Equipamentos | Equipamentos utilizados nas obras |
| Tipos de ocorrência | Classificação de ocorrências |
| Checklist | Itens de verificação diária |
| Modelos de relatório | Templates para relatórios em PDF |

Os registros são associados à empresa responsável.

---

## Monitoramento com Sentry

O Sentry foi configurado para:

- captura de erros do frontend;
- captura de erros do backend;
- monitoramento de desempenho;
- tracing de navegação;
- logs estruturados;
- identificação da rota e linha onde a falha ocorreu;
- envio de source maps durante a build.

Arquivos principais:

```text
src/instrumentation-client.ts
src/instrumentation.ts
src/app/global-error.tsx
sentry.server.config.ts
sentry.edge.config.ts
```

### Privacidade

A configuração do navegador deve manter:

```typescript
sendDefaultPii: false
```

O Session Replay deve:

- mascarar todos os textos;
- mascarar campos de entrada;
- bloquear imagens e vídeos;
- permanecer desativado em produção até a revisão de LGPD.

Configuração recomendada:

```typescript
replaysSessionSampleRate:
  process.env.NODE_ENV === 'production' ? 0 : 0.1

replaysOnErrorSampleRate:
  process.env.NODE_ENV === 'production' ? 0 : 1.0
```

A amostragem de performance recomendada é:

```typescript
tracesSampleRate:
  process.env.NODE_ENV === 'production' ? 0.1 : 1.0
```

Não devem ser enviados ao Sentry:

- senhas;
- tokens;
- CPF;
- dados completos de usuários;
- corpos completos de requisições;
- conteúdo de contratos;
- conteúdo de relatórios;
- URLs privadas de anexos.

---

## Testes

### Executar testes unitários

```bash
npm test
```

Estado validado durante o hardening:

```text
Test Suites: 2 passed
Tests:       39 passed
```

### Executar com cobertura

```bash
npm run test:coverage
```

### Testes existentes

#### `worksite-progressive.test.ts`

Cobre:

- cadastro simples;
- cadastro completo;
- campos essenciais;
- schema unificado;
- cálculo de preenchimento do perfil;
- casos de borda.

#### `s3-upload-validation.test.ts`

Cobre:

- extensões permitidas;
- tipos MIME;
- arquivos executáveis;
- dupla extensão;
- nomes suspeitos;
- casos de upload inválido.

### Próximos testes prioritários

- RBAC;
- multitenancy;
- associação por obra;
- acesso entre empresas diferentes;
- sessão após desativação do usuário;
- alteração de perfil durante sessão ativa;
- reset simultâneo de senha;
- transições de status do diário;
- validação real do objeto enviado ao R2;
- concorrência na aprovação de RDO.

---

## Segurança implementada

- hash de senhas com bcrypt;
- autenticação por sessão JWT;
- cookies `HttpOnly`, `Secure` e `SameSite`;
- validação de entrada com Zod;
- arquitetura multitenant baseada em `companyId`;
- permissões por perfil;
- associação de usuários às obras;
- logs de auditoria;
- validação inicial de nome, extensão, MIME e tamanho de upload;
- UUIDs para identificação dos recursos;
- headers HTTP:
  - HSTS;
  - `X-Frame-Options`;
  - `X-Content-Type-Options`;
  - `Referrer-Policy`;
  - `Permissions-Policy`;
- execução Docker com usuário não-root;
- monitoramento com Sentry;
- arquivo de token do Sentry ignorado pelo Git.

---

## Hardening de segurança em andamento

Itens que devem ser concluídos antes da produção:

- centralizar autorização de obras e diários;
- impedir BOLA/IDOR dentro do mesmo tenant;
- validar associação à obra em todas as operações;
- implementar revogação de sessão;
- invalidar sessões após troca de senha;
- tornar o consumo do token de reset atômico;
- implementar rate limiting com Redis;
- proteger o seed;
- remover senhas demonstrativas fixas;
- validar tamanho e tipo real de arquivos no storage;
- implementar quarentena e análise de malware;
- adicionar Content Security Policy;
- ampliar cobertura de testes;
- configurar SonarQube Cloud;
- adicionar SAST, SCA e secret scanning à pipeline;
- adicionar scan da imagem Docker;
- revisar retenção e tratamento de dados conforme LGPD;
- testar restauração de backups.

---

## Auditoria de dependências

Execute:

```bash
npm audit
```

Para analisar somente dependências utilizadas em produção:

```bash
npm audit --omit=dev
```

Não utilize automaticamente:

```bash
npm audit fix --force
```

O uso de `--force` pode instalar versões incompatíveis e introduzir breaking changes.

No estado atual revisado, o audit não possui vulnerabilidades críticas ou altas. Permanecem alertas moderados relacionados ao PostCSS interno utilizado pelo Next.js 15.5.18.

A mitigação temporária consiste em:

- build apenas com código confiável;
- revisão obrigatória de pull requests;
- proteção da branch principal;
- atualização do Next.js quando houver versão compatível com a correção.

---

## CI/CD

Pipeline:

```text
.github/workflows/ci.yml
```

Jobs existentes:

### Quality

- instalação de dependências;
- geração do Prisma Client;
- ESLint;
- TypeScript.

### Test

- instalação de dependências;
- geração do Prisma Client;
- execução dos testes Jest.

### Build

- PostgreSQL como serviço;
- aplicação das migrations;
- build de produção.

### Melhorias planejadas

- cobertura obrigatória;
- testes de integração;
- testes Playwright de smoke;
- `npm audit` bloqueante para falhas altas e críticas;
- Dependabot;
- CodeQL ou Semgrep;
- Gitleaks;
- Trivy;
- SBOM;
- SonarQube Cloud;
- proteção obrigatória da branch `main`.

---

## SonarQube Cloud

A integração com SonarQube Cloud está planejada para analisar:

- bugs potenciais;
- vulnerabilidades;
- hotspots de segurança;
- duplicação de código;
- complexidade;
- code smells;
- cobertura de testes.

O Sentry e o Sonar possuem funções diferentes:

```text
Sonar → analisa o código antes da publicação
Sentry → monitora erros reais após a aplicação estar rodando
```

---

## Build de produção

Execute:

```bash
npm run build
```

Depois:

```bash
npm start
```

O projeto utiliza:

```javascript
output: 'standalone'
```

Isso permite criar uma imagem Docker de produção mais enxuta.

---

## Docker

### Criar a imagem

```bash
docker build -t obraflow-saas .
```

### Executar localmente

```bash
docker run \
  --name obraflow-saas \
  -p 3000:3000 \
  --env-file .env.local \
  obraflow-saas
```

A `DATABASE_URL` utilizada pelo container deve apontar para um PostgreSQL acessível pelo ambiente do container.

---

## Arquitetura planejada para produção

```text
GitHub
  └── Código e pipeline

Servidor da aplicação
  └── Next.js em container Docker

PostgreSQL gerenciado
  └── Empresas, usuários, obras e diários

Cloudflare R2
  └── Fotos e anexos

Resend
  └── E-mails e recuperação de senha

Sentry
  └── Erros, logs e desempenho

SonarQube Cloud
  └── Qualidade e segurança do código
```

Em produção, o computador da pessoa desenvolvedora não precisa permanecer ligado.

A aplicação e o banco ficam disponíveis em serviços de hospedagem preparados para operar continuamente.

---

## Variáveis de produção

Exemplo:

```env
NODE_ENV=production

NEXT_PUBLIC_APP_URL=https://app.seu-dominio.com.br
NEXT_PUBLIC_APP_NAME="ObraFlow"

DATABASE_URL=postgresql://usuario:senha@servidor:5432/obraflow

AUTH_SECRET=gere-uma-chave-exclusiva-de-producao
NEXTAUTH_URL=https://app.seu-dominio.com.br

NEXT_PUBLIC_SENTRY_DSN=https://SEU_DSN_DO_SENTRY

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=

RESEND_API_KEY=
EMAIL_FROM=noreply@seu-dominio.com.br
EMAIL_FROM_NAME="ObraFlow"
```

As variáveis reais de produção devem ficar no painel da hospedagem ou em um gerenciador de secrets.

Elas nunca devem ser commitadas no GitHub.

---

## Migrations em produção

Para aplicar migrations já versionadas:

```bash
npx prisma migrate deploy
```

Não utilize em produção:

```bash
npx prisma migrate dev
```

O fluxo recomendado é:

```text
Código enviado ao GitHub
        ↓
Pipeline executa validações
        ↓
Imagem ou build é gerada
        ↓
Migrations são aplicadas
        ↓
Nova versão é publicada
```

---

## Checklist antes da produção

### Aplicação

- [ ] lint aprovado;
- [ ] type-check aprovado;
- [ ] testes unitários aprovados;
- [ ] testes E2E críticos aprovados;
- [ ] build de produção aprovado;
- [ ] página de exemplo do Sentry removida;
- [ ] logs sem dados pessoais.

### Segurança

- [ ] `AUTH_SECRET` exclusivo de produção;
- [ ] seed protegido;
- [ ] senhas demonstrativas removidas;
- [ ] autorização centralizada;
- [ ] testes de RBAC e multitenancy;
- [ ] rate limiting ativo;
- [ ] CSP configurada;
- [ ] uploads verificados no storage;
- [ ] sessão revogável;
- [ ] SAST e SCA ativos;
- [ ] secret scanning ativo;
- [ ] imagem Docker verificada.

### Infraestrutura

- [ ] PostgreSQL sem acesso público desnecessário;
- [ ] Redis protegido;
- [ ] bucket R2 privado;
- [ ] HTTPS obrigatório;
- [ ] domínio configurado;
- [ ] health check configurado;
- [ ] reinício automático;
- [ ] backup automático;
- [ ] restauração de backup testada;
- [ ] monitoramento de uptime;
- [ ] alertas do Sentry configurados.

### LGPD

- [ ] política de privacidade;
- [ ] política de retenção;
- [ ] processo de exclusão ou anonimização;
- [ ] controle de acesso aos dados;
- [ ] Session Replay revisado;
- [ ] plano de resposta a incidentes;
- [ ] dados pessoais removidos de logs e monitoramento.

---

## Rotas principais

| Rota | Descrição |
|---|---|
| `/login` | Login |
| `/forgot-password` | Solicitação de recuperação |
| `/reset-password` | Alteração de senha |
| `/accept-invite` | Aceite de convite |
| `/obras` | Listagem de obras |
| `/obras/[id]` | Detalhe da obra |
| `/obras/[id]/editar` | Edição da obra |
| `/obras/[id]/diarios` | Diários da obra |
| `/diarios` | Listagem geral de diários |
| `/diarios/[id]` | Detalhes do diário |
| `/relatorios` | Geração de relatórios |
| `/analise` | Indicadores e análises |
| `/cadastros/perfil` | Perfil do usuário |
| `/cadastros/empresa` | Dados da empresa |
| `/cadastros/usuarios` | Gestão de usuários |
| `/cadastros/grupos` | Grupos de obra |
| `/cadastros/mao-de-obra` | Funções de mão de obra |
| `/cadastros/equipamentos` | Equipamentos |
| `/cadastros/tipos-ocorrencia` | Tipos de ocorrência |
| `/cadastros/checklist` | Checklist |
| `/client` | Portal do cliente/síndico |

---

## Redirects de compatibilidade

| Rota anterior | Nova rota |
|---|---|
| `/admin/usuarios` | `/cadastros/usuarios` |
| `/admin/empresa` | `/cadastros/empresa` |
| `/perfil` | `/cadastros/perfil` |
| `/obras/nova` | `/obras` |

---

## Licença

Projeto proprietário.

**ObraFlow SaaS © 2026**