# Guia de Deploy — Diário de Obras SaaS

**Versão:** 1.0.0  
**Data:** 2025  

---

## Sumário

1. [Requisitos de Infraestrutura](#1-requisitos-de-infraestrutura)
2. [Opções de Hospedagem](#2-opções-de-hospedagem)
3. [Configuração do PostgreSQL Gerenciado](#3-configuração-do-postgresql-gerenciado)
4. [Configuração do Storage S3/R2](#4-configuração-do-storage-s3r2)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Processo de Deploy](#6-processo-de-deploy)
7. [HTTPS e Domínio](#7-https-e-domínio)
8. [Checklist de Produção](#8-checklist-de-produção)
9. [Monitoramento Básico](#9-monitoramento-básico)
10. [Estratégia de Backup](#10-estratégia-de-backup)
11. [Rollback e Recuperação](#11-rollback-e-recuperação)

---

## 1. Requisitos de Infraestrutura

### 1.1 Aplicação (Next.js)

| Recurso | Mínimo (Starter) | Recomendado (Pro) |
|---|---|---|
| CPU | 0.5 vCPU | 2 vCPU |
| RAM | 512 MB | 1 GB |
| Storage (app) | 1 GB | 5 GB |
| Banda mensal | 100 GB | 500 GB |

### 1.2 PostgreSQL

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 4 GB |
| Storage | 20 GB | 100 GB (SSD) |
| Conexões | 20 (pool) | 100 |

### 1.3 Redis

| Recurso | Mínimo |
|---|---|
| RAM | 256 MB |
| Persistência | AOF habilitado |

### 1.4 Object Storage (R2/S3)

- Sem limite pré-definido; pago por uso
- Regiões: `auto` (Cloudflare R2) ou `sa-east-1` (AWS S3 Brasil)

---

## 2. Opções de Hospedagem

### 2.1 Railway (Recomendado para MVP)

**Vantagens:** Deploy via GitHub em 1 clique, PostgreSQL e Redis integrados, preços previsíveis, boa DX.

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login e link do projeto
railway login
railway init

# Deploy
railway up

# Variáveis de ambiente
railway variables set DATABASE_URL="..."
railway variables set NEXTAUTH_SECRET="..."
```

**Custos estimados (MVP):**
- App: ~$5-20/mês
- PostgreSQL: ~$5-15/mês
- Redis: ~$5/mês
- **Total: ~$15-40/mês**

---

### 2.2 Render

**Vantagens:** Free tier para serviços; PostgreSQL managed; deploy via GitHub.

```yaml
# render.yaml
services:
  - type: web
    name: diario-obras-app
    runtime: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: diario-obras-db
          property: connectionString

databases:
  - name: diario-obras-db
    plan: starter
    databaseName: diariobras
    user: app
```

**Custos estimados:**
- App: $7/mês (starter)
- PostgreSQL: $7/mês (starter)
- **Total: ~$14-30/mês**

---

### 2.3 Fly.io

**Vantagens:** Deploy em múltiplas regiões; containers Docker; latência baixa no Brasil (GRU).

```toml
# fly.toml
app = "diario-obras-saas"
primary_region = "gru"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

```bash
# Deploy
fly launch
fly postgres create --name diario-obras-db
fly redis create --name diario-obras-redis
fly deploy
```

---

### 2.4 AWS (Enterprise)

Para escala maior ou exigência de dados em território nacional (LGPD).

| Serviço | Uso |
|---|---|
| **ECS Fargate** | Container da aplicação |
| **RDS PostgreSQL** | Banco gerenciado (Multi-AZ) |
| **ElastiCache Redis** | Cache e rate limiting |
| **S3 sa-east-1** | Storage de arquivos |
| **CloudFront** | CDN para assets estáticos |
| **ACM** | Certificados TLS |
| **Secrets Manager** | Gerenciamento de segredos |
| **CloudWatch** | Logs e monitoramento |

**Estimativa:** $100-300/mês para MVP com redundância.

---

## 3. Configuração do PostgreSQL Gerenciado

### 3.1 Configurações Essenciais

```sql
-- Executar após criação do banco

-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Timezone
SET timezone = 'UTC';

-- Configurações de performance (ajustar conforme RAM disponível)
ALTER SYSTEM SET shared_buffers = '256MB';       -- 25% da RAM
ALTER SYSTEM SET effective_cache_size = '768MB'; -- 75% da RAM
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET max_connections = 100;

-- Logging de queries lentas (> 1 segundo)
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'mod';
```

### 3.2 Connection Pooling

Em produção, use PgBouncer ou o pool nativo do Prisma:

```env
# Pool de conexões via DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"
```

### 3.3 Migrations em Produção

```bash
# Nunca use prisma db push em produção
# Use apenas migrations versionadas

# Gerar migration (em desenvolvimento)
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em produção
npx prisma migrate deploy
```

### 3.4 Regras de Segurança no Banco

```sql
-- Criar usuário com permissões mínimas para a aplicação
CREATE USER app_user WITH PASSWORD 'senha_forte';
GRANT CONNECT ON DATABASE diariobras TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- AuditLog append-only
REVOKE UPDATE, DELETE ON "AuditLog" FROM app_user;
```

---

## 4. Configuração do Storage S3/R2

### 4.1 Cloudflare R2 (Recomendado)

```bash
# Via Wrangler CLI
wrangler r2 bucket create diario-obras-files
wrangler r2 bucket create diario-obras-backups

# Configurar CORS para uploads diretos do browser
```

```json
// cors-config.json para o bucket
[
  {
    "AllowedOrigins": ["https://app.diario-obras.com.br"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "Authorization"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4.2 AWS S3

```bash
# Criar bucket na região sa-east-1
aws s3api create-bucket \
  --bucket diario-obras-files \
  --region sa-east-1 \
  --create-bucket-configuration LocationConstraint=sa-east-1

# Habilitar versionamento
aws s3api put-bucket-versioning \
  --bucket diario-obras-files \
  --versioning-configuration Status=Enabled

# Bloquear acesso público
aws s3api put-public-access-block \
  --bucket diario-obras-files \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,\
    BlockPublicPolicy=true,RestrictPublicBuckets=true

# Habilitar Server-Side Encryption
aws s3api put-bucket-encryption \
  --bucket diario-obras-files \
  --server-side-encryption-configuration '{
    "Rules": [{ "ApplyServerSideEncryptionByDefault": { "SSEAlgorithm": "AES256" } }]
  }'
```

### 4.3 Política de Ciclo de Vida

```json
{
  "Rules": [
    {
      "ID": "delete-temp-uploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 1 }
    },
    {
      "ID": "archive-old-reports",
      "Status": "Enabled",
      "Filter": { "Prefix": "reports/" },
      "Transitions": [
        { "Days": 90, "StorageClass": "STANDARD_IA" },
        { "Days": 365, "StorageClass": "GLACIER" }
      ]
    }
  ]
}
```

---

## 5. Variáveis de Ambiente

### 5.1 Template `.env.example`

```env
# ─── Aplicação ──────────────────────────────────────────────
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.diario-obras.com.br
NEXT_PUBLIC_APP_NAME="Diário de Obras"

# ─── Banco de Dados ─────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/diariobras?sslmode=require"

# ─── Autenticação (Auth.js) ──────────────────────────────────
# Gerar com: openssl rand -base64 32
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL=https://app.diario-obras.com.br

# ─── Redis ──────────────────────────────────────────────────
REDIS_URL="redis://:password@host:6379"

# ─── Storage (Cloudflare R2) ─────────────────────────────────
R2_ACCOUNT_ID="seu-account-id"
R2_ACCESS_KEY_ID="sua-access-key"
R2_SECRET_ACCESS_KEY="seu-secret-key"
R2_BUCKET_NAME="diario-obras-files"
R2_PUBLIC_URL="https://files.diario-obras.com.br"

# ─── Storage (AWS S3) — alternativa ─────────────────────────
# AWS_ACCESS_KEY_ID="sua-access-key"
# AWS_SECRET_ACCESS_KEY="seu-secret-key"
# AWS_REGION="sa-east-1"
# AWS_S3_BUCKET="diario-obras-files"

# ─── E-mail (Resend) ─────────────────────────────────────────
RESEND_API_KEY="re_sua_chave"
EMAIL_FROM="noreply@diario-obras.com.br"
EMAIL_FROM_NAME="Diário de Obras"

# ─── Monitoramento ───────────────────────────────────────────
SENTRY_DSN="https://abc@sentry.io/123"
SENTRY_ORG="sua-org"
SENTRY_PROJECT="diario-obras"

# ─── Funcionalidades ─────────────────────────────────────────
# Taxa de upload máxima por arquivo (em MB)
MAX_UPLOAD_SIZE_MB=20
MAX_PDF_SIZE_MB=50

# ─── Rate Limiting ───────────────────────────────────────────
RATE_LIMIT_LOGIN_ATTEMPTS=5
RATE_LIMIT_LOGIN_WINDOW_MINUTES=1
RATE_LIMIT_API_REQUESTS_PER_MINUTE=100
```

### 5.2 Segredos — Nunca Commitados

Os seguintes valores **não devem jamais** aparecer no repositório Git:

- `NEXTAUTH_SECRET`
- `DATABASE_URL` (contém senha)
- `R2_SECRET_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY`
- `RESEND_API_KEY`
- `REDIS_URL` (contém senha)
- `SENTRY_DSN`

Use o gerenciador de segredos do provedor de hospedagem ou uma ferramenta como Doppler.

---

## 6. Processo de Deploy

### 6.1 Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### 6.2 docker-compose.yml (Desenvolvimento Local)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: diariobras
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d diariobras"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass devpass
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 6.3 GitHub Actions — CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### 6.4 Script de Deploy com Migrations

```bash
#!/bin/bash
# deploy.sh — executado antes de iniciar a aplicação

set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting application..."
node server.js
```

---

## 7. HTTPS e Domínio

### 7.1 Configuração Obrigatória

- **Certificado TLS:** Let's Encrypt (via provedor) ou AWS ACM
- **Redirecionamento HTTP → HTTPS:** configurado no provedor ou em `next.config.ts`
- **HSTS:** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

### 7.2 Configuração no next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
]

const config: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflareStorage.com' },
    ],
  },
}

export default config
```

### 7.3 DNS

| Registro | Tipo | Valor |
|---|---|---|
| `app.diario-obras.com.br` | A / CNAME | IP do provedor |
| `files.diario-obras.com.br` | CNAME | `pub-xxx.r2.dev` (R2 custom domain) |
| `*.app.diario-obras.com.br` | CNAME | Wildcard para subdomínios de tenant |

---

## 8. Checklist de Produção

### 8.1 Antes do Go-Live

#### Segurança
- [ ] `NEXTAUTH_SECRET` gerado com `openssl rand -base64 32`
- [ ] Banco de dados sem IP público (apenas rede privada)
- [ ] Redis sem IP público
- [ ] Bucket S3/R2 com acesso público bloqueado
- [ ] Headers de segurança HTTP configurados
- [ ] HTTPS obrigatório (redirecionamento de HTTP)
- [ ] Rate limiting configurado e testado
- [ ] Variáveis de ambiente não estão no repositório
- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] Senhas fortes em todos os serviços (não padrões)

#### Banco de Dados
- [ ] Migrations aplicadas com `prisma migrate deploy`
- [ ] Backup automático configurado
- [ ] Teste de restore realizado
- [ ] Índices criados (verificar `EXPLAIN ANALYZE` nas queries principais)
- [ ] Connection pooling configurado
- [ ] Usuário da aplicação com permissões mínimas

#### Storage
- [ ] Bucket criado com SSE habilitado
- [ ] CORS configurado para o domínio de produção
- [ ] Lifecycle policies configuradas
- [ ] Backup/replicação habilitado

#### Aplicação
- [ ] `NODE_ENV=production` definido
- [ ] Logs estruturados configurados
- [ ] Sentry (ou similar) configurado
- [ ] Health check endpoint respondendo (`/api/health`)
- [ ] Migrações testadas em staging antes de produção

#### LGPD
- [ ] Política de privacidade publicada
- [ ] DPA assinado com todos os processadores (Railway, R2, Resend, Sentry)
- [ ] Contato do DPO definido e acessível
- [ ] Mecanismo de exportação de dados funcionando
- [ ] Consentimento de comunicações implementado

#### Monitoramento
- [ ] Uptime monitor configurado (Uptime Robot ou Better Uptime)
- [ ] Alertas de erro configurados (Sentry)
- [ ] Alertas de banco configurados (CPU > 80%, storage > 70%)
- [ ] Dashboard básico de métricas

---

## 9. Monitoramento Básico

### 9.1 Health Check Endpoint

```typescript
// src/app/api/health/route.ts
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    )
  }
}
```

### 9.2 Métricas a Monitorar

| Métrica | Threshold de Alerta | Ação |
|---|---|---|
| Uptime | < 99.5% | Investigar imediatamente |
| Tempo de resposta (p95) | > 2s | Investigar queries lentas |
| Taxa de erro 5xx | > 1% | Investigar logs Sentry |
| Uso de CPU (app) | > 80% por 5min | Scale up |
| Uso de RAM (app) | > 85% | Investigar vazamentos |
| Uso de storage DB | > 70% | Provisionar mais espaço |
| Conexões ativas DB | > 80% do max | Verificar pool |

### 9.3 Ferramentas Recomendadas

| Ferramenta | Propósito | Custo |
|---|---|---|
| Uptime Robot | Monitoramento de uptime | Free (5 monitors) |
| Better Uptime | Uptime + status page | $20/mês |
| Sentry | Rastreamento de erros | Free até 5k erros/mês |
| Logtail / Axiom | Logs estruturados | Free tier disponível |
| Prisma Pulse | Métricas de banco | Pago |

---

## 10. Estratégia de Backup

### 10.1 Banco de Dados

```bash
# Backup manual via pg_dump
pg_dump \
  --host=HOST \
  --port=5432 \
  --username=USER \
  --dbname=diariobras \
  --format=custom \
  --compress=9 \
  --file="backup-$(date +%Y%m%d-%H%M%S).dump"

# Upload para bucket de backup
aws s3 cp backup-*.dump s3://diario-obras-backups/db/
```

### 10.2 Automação de Backup (Railway / Render)

Os provedores gerenciados realizam backup automático diário. Verificar e confirmar:
- [ ] Backups diários habilitados
- [ ] Retenção mínima de 30 dias
- [ ] Backups em região diferente da aplicação (cross-region)

### 10.3 Procedimento de Restore

```bash
# 1. Baixar backup
aws s3 cp s3://diario-obras-backups/db/backup-YYYYMMDD.dump ./

# 2. Criar banco temporário
createdb diariobras_restore

# 3. Restore
pg_restore \
  --host=HOST \
  --username=USER \
  --dbname=diariobras_restore \
  --verbose \
  backup-YYYYMMDD.dump

# 4. Validar dados
psql -h HOST -U USER -d diariobras_restore -c "SELECT COUNT(*) FROM \"DailyLog\""

# 5. Se OK, fazer swap do banco (coordenar com equipe)
```

### 10.4 Backup de Arquivos (R2/S3)

- R2: replicação automática na Cloudflare (redundância interna)
- S3: habilitar Cross-Region Replication para bucket de backup

```bash
# Verificar integridade dos arquivos críticos periodicamente
aws s3 ls s3://diario-obras-files --recursive --human-readable | wc -l
```

### 10.5 RTO e RPO

| Métrica | Target | Como é Atingido |
|---|---|---|
| RPO (Recovery Point Objective) | 24 horas | Backup diário automático |
| RTO (Recovery Time Objective) | 4 horas | Processo de restore documentado e testado |

> **Recomendação:** Realizar drill de disaster recovery a cada 3 meses. Documentar resultados.

---

## 11. Rollback e Recuperação

### 11.1 Rollback de Deploy

```bash
# Railway
railway rollback

# Fly.io — listar versões
flyctl releases list
# Rollback para versão anterior
flyctl deploy --image registry.fly.io/diario-obras:v42
```

### 11.2 Rollback de Migration (com cuidado)

```bash
# Reverter a última migration (somente se não afetou dados críticos)
npx prisma migrate resolve --rolled-back "nome_da_migration"

# Em seguida, aplicar SQL de rollback manualmente se necessário
```

> **Atenção:** Migrações que removem colunas ou tabelas são irreversíveis sem backup. Sempre faça backup antes de migrations destrutivas em produção.

### 11.3 Runbook de Incidentes Comuns

| Incidente | Diagnóstico | Ação |
|---|---|---|
| App retorna 503 | Verificar logs + health check | Reiniciar container; verificar DB |
| Queries lentas | `EXPLAIN ANALYZE` + Prisma logs | Adicionar índice ou otimizar query |
| Disco do banco cheio | Verificar tamanho por tabela | Provisionar storage; limpar logs antigos |
| Upload falhando | Verificar credenciais R2/S3 | Renovar access key; verificar CORS |
| Login falhando | Verificar NEXTAUTH_SECRET; sessões Redis | Validar variáveis de ambiente |
