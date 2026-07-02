# Especificação Técnica — Diário de Obras SaaS

**Versão:** 1.0.0  
**Data:** 2025  
**Status:** Draft  

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Escopo do MVP](#2-escopo-do-mvp)
3. [Funcionalidades Fora do MVP](#3-funcionalidades-fora-do-mvp)
4. [Arquitetura Proposta](#4-arquitetura-proposta)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [Regras de Negócio](#6-regras-de-negócio)
7. [Perfis de Acesso e Permissões](#7-perfis-de-acesso-e-permissões)
8. [Estratégia de Segurança](#8-estratégia-de-segurança)
9. [Estratégia LGPD](#9-estratégia-lgpd)
10. [Estratégia de Backup](#10-estratégia-de-backup)
11. [Logs e Auditoria](#11-logs-e-auditoria)
12. [Critérios de Aceite](#12-critérios-de-aceite)
13. [Plano de Implementação por Fases](#13-plano-de-implementação-por-fases)

---

## 1. Visão Geral do Produto

### 1.1 Contexto

O **Diário de Obras SaaS** é uma plataforma web multi-tenant destinada a empresas de construção civil,
construtoras, incorporadoras e administradoras de obras. O sistema digitaliza e centraliza o Registro
Diário de Obras (RDO), substituindo planilhas, PDFs e anotações manuais por um fluxo digital
rastreável, auditável e acessível em qualquer dispositivo.

### 1.2 Problema

- Construtoras perdem informações críticas de obras por falta de registro sistemático
- Laudos e relatórios são produzidos manualmente, consumindo horas de trabalho
- Síndicos e clientes não têm visibilidade do andamento da obra em tempo real
- Auditoria retroativa é difícil sem rastreabilidade de atividades, mão de obra e materiais
- Disputas contratuais carecem de evidências documentadas (fotos com geolocalização e timestamp)

### 1.3 Proposta de Valor

| Para | O sistema oferece |
|---|---|
| Gestores de obra | Registro ágil do diário diário via mobile/web |
| Empresas | Visão consolidada de todas as obras, relatórios automáticos |
| Clientes/Síndicos | Portal de acompanhamento com transparência e histórico |
| Auditores/Jurídico | Trilha de auditoria imutável, evidências com timestamp |

### 1.4 Modelo de Negócio

SaaS com planos por empresa (tenant):

- **Starter:** até 3 obras ativas, 5 usuários
- **Pro:** obras ilimitadas, 20 usuários, relatórios PDF
- **Enterprise:** multi-CNPJ, SSO, SLA, suporte dedicado

---

## 2. Escopo do MVP

O MVP foca na entrega de valor imediato ao gestor de obras e à empresa contratante.

### 2.1 Funcionalidades Incluídas no MVP

#### Autenticação e Gestão de Usuários
- Cadastro de empresa (tenant) com plano
- Login com e-mail e senha (bcrypt + JWT)
- Recuperação de senha por e-mail
- Perfis: SUPER_ADMIN, ADMIN_EMPRESA, GESTOR_OBRA, COLABORADOR, CLIENTE_SINDICO
- Convite de usuário por e-mail

#### Gestão de Obras
- CRUD completo de obras (Worksite)
- Dados: endereço, responsável técnico, ART, data início/fim prevista
- Associação de usuários a obras com papel específico
- Status de obra: PLANEJAMENTO, EM_ANDAMENTO, PAUSADA, CONCLUIDA, CANCELADA

#### Diário de Obra
- Criação do diário por data (um por obra por dia)
- Registro de condições climáticas
- Registro de atividades executadas
- Registro de mão de obra (quantidade, função, turno)
- Registro de materiais utilizados (descrição, quantidade, unidade)
- Registro de ocorrências (incidentes, paralisações, observações)
- Assinatura/aprovação do diário pelo gestor
- Status: RASCUNHO, SUBMETIDO, APROVADO

#### Fotos e Anexos
- Upload de fotos por diário e por atividade
- Upload de documentos PDF, DWG (referência)
- Armazenamento em S3-compatible (Cloudflare R2 ou AWS S3)
- Metadados: timestamp do servidor, descrição, uploader

#### Área do Cliente/Síndico
- Portal de leitura somente
- Visualização de diários aprovados da obra associada
- Visualização de fotos aprovadas
- Download do relatório PDF

#### Relatórios
- Geração de relatório PDF do diário individual
- Relatório consolidado de período (range de datas)
- Cabeçalho com logo da empresa, dados da obra, período

#### Auditoria
- Log de todas as ações relevantes (criação, edição, exclusão, aprovação, login)
- Registro de IP, user agent, timestamp, usuário, entidade afetada

### 2.2 Requisitos Não-Funcionais do MVP

- Tempo de resposta < 2s para listagens (p95)
- Disponibilidade alvo: 99,5% (excluindo janelas de manutenção)
- Suporte a dispositivos móveis (responsive, PWA básico)
- HTTPS obrigatório em produção
- Conformidade LGPD básica (consentimento, política de privacidade)

---

## 3. Funcionalidades Fora do MVP

As seguintes funcionalidades estão documentadas para versões futuras mas **não fazem parte do MVP**:

| Funcionalidade | Justificativa de Exclusão |
|---|---|
| App mobile nativo (iOS/Android) | Custo elevado; PWA atende MVP |
| Integração com ERP (SAP, TOTVS) | Complexidade de integração; pós-MVP |
| Cronograma Gantt integrado | Escopo grande; produto separado |
| Gestão financeira / orçamento | Fora do foco principal (RDO) |
| Assinatura digital com certificado ICP-Brasil | Custo e complexidade; planejado v2 |
| Notificações push mobile | Dependente de app nativo |
| Reconhecimento de imagem (IA) | Pós-MVP |
| Multi-idioma (i18n) | Mercado inicial é Brasil |
| SSO / SAML | Somente no plano Enterprise futuro |
| Módulo de medição e boletim | Pós-MVP |
| Integração com BIM | Pós-MVP |
| API pública / webhooks | Pós-MVP |

---

## 4. Arquitetura Proposta

### 4.1 Visão Geral

Monorepo com **Next.js 14+ App Router** como framework full-stack:

- **Frontend:** React com App Router (Server Components + Client Components)
- **Backend:** API Routes do Next.js (Route Handlers) — não há servidor separado no MVP
- **Banco de dados:** PostgreSQL via Prisma ORM
- **Autenticação:** NextAuth.js v5 (Auth.js)
- **Storage:** Cloudflare R2 (compatível com S3 SDK)
- **E-mail:** Resend ou Nodemailer com SMTP
- **PDF:** Puppeteer (headless) ou React-PDF

### 4.2 Estratégia de Multitenancy

Isolamento por **Row-Level Security (RLS) lógico via `companyId`**:

- Cada tenant é identificado por `companyId` (UUID)
- Todas as queries incluem `WHERE companyId = :tenantId`
- O `companyId` é extraído do JWT e validado em middleware
- Subdomínio opcional: `{slug}.app.dominio.com.br` para branding

### 4.3 Estrutura de Pastas

```
diario-obras-saas/
├── docs/                    # Documentação técnica
├── prisma/
│   ├── schema.prisma        # Schema do banco de dados
│   └── migrations/          # Migrations geradas pelo Prisma
├── public/                  # Assets estáticos
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Rotas públicas de autenticação
│   │   ├── (dashboard)/     # Rotas protegidas do app
│   │   │   ├── admin/       # Área administrativa da empresa
│   │   │   ├── obras/       # Gestão de obras
│   │   │   ├── diarios/     # Diário de obras
│   │   │   └── relatorios/  # Relatórios
│   │   ├── (client)/        # Portal do cliente/síndico
│   │   └── api/             # Route Handlers (API)
│   │       ├── auth/        # NextAuth handlers
│   │       ├── companies/
│   │       ├── users/
│   │       ├── worksites/
│   │       ├── daily-logs/
│   │       └── reports/
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── ui/              # Componentes base (shadcn/ui)
│   │   └── domain/          # Componentes de domínio
│   ├── lib/                 # Utilitários e configurações
│   │   ├── auth.ts          # Configuração NextAuth
│   │   ├── db.ts            # Cliente Prisma singleton
│   │   ├── s3.ts            # Cliente S3/R2
│   │   ├── email.ts         # Serviço de e-mail
│   │   └── pdf.ts           # Geração de PDF
│   ├── hooks/               # React hooks customizados
│   ├── types/               # TypeScript types e interfaces
│   └── middleware.ts        # Middleware Next.js (auth, tenant)
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 5. Modelo de Dados

### Entidades Principais

#### Company (Tenant)
```
id            UUID PK
name          String
cnpj          String UNIQUE
slug          String UNIQUE
plan          Enum (STARTER, PRO, ENTERPRISE)
status        Enum (ACTIVE, SUSPENDED, CANCELLED)
logoUrl       String?
createdAt     DateTime
updatedAt     DateTime
```

#### User
```
id            UUID PK
companyId     UUID FK → Company
email         String UNIQUE
passwordHash  String
name          String
phone         String?
avatarUrl     String?
role          Enum (SUPER_ADMIN, ADMIN_EMPRESA, GESTOR_OBRA, COLABORADOR, CLIENTE_SINDICO)
isActive      Boolean DEFAULT true
lastLoginAt   DateTime?
createdAt     DateTime
updatedAt     DateTime
```

#### Worksite (Obra)
```
id              UUID PK
companyId       UUID FK → Company
name            String
address         String
city            String
state           String
cep             String
lat             Decimal?
lng             Decimal?
artNumber       String?
responsibleName String
startDate       Date
endDateForecast Date?
endDateActual   Date?
status          Enum (PLANEJAMENTO, EM_ANDAMENTO, PAUSADA, CONCLUIDA, CANCELADA)
description     String?
createdById     UUID FK → User
createdAt       DateTime
updatedAt       DateTime
```

#### WorksiteUser (Obra ↔ Usuário)
```
id          UUID PK
worksiteId  UUID FK → Worksite
userId      UUID FK → User
role        Enum (GESTOR_OBRA, COLABORADOR, CLIENTE_SINDICO)
assignedAt  DateTime
assignedBy  UUID FK → User
```

#### DailyLog (Diário)
```
id            UUID PK
worksiteId    UUID FK → Worksite
companyId     UUID FK → Company
date          Date
weather       Enum (ENSOLARADO, NUBLADO, CHUVOSO, TEMPESTADE, NEVE, VENTO_FORTE)
tempMin       Decimal?
tempMax       Decimal?
notes         String?
status        Enum (RASCUNHO, SUBMETIDO, APROVADO)
createdById   UUID FK → User
submittedAt   DateTime?
approvedById  UUID FK → User?
approvedAt    DateTime?
createdAt     DateTime
updatedAt     DateTime
UNIQUE (worksiteId, date)
```

#### Activity (Atividade do Diário)
```
id          UUID PK
dailyLogId  UUID FK → DailyLog
companyId   UUID FK → Company
description String
location    String?
progress    Decimal? (percentual 0-100)
notes       String?
order       Int
createdById UUID FK → User
createdAt   DateTime
updatedAt   DateTime
```

#### Labor (Mão de Obra)
```
id          UUID PK
dailyLogId  UUID FK → DailyLog
companyId   UUID FK → Company
role        String  (ex: "Pedreiro", "Eletricista")
quantity    Int
shift       Enum (MANHA, TARDE, NOITE, INTEGRAL)
contractor  String? (subcontratada)
notes       String?
createdAt   DateTime
```

#### Material (Material Utilizado)
```
id          UUID PK
dailyLogId  UUID FK → DailyLog
companyId   UUID FK → Company
name        String
quantity    Decimal
unit        String  (ex: "m³", "kg", "un", "m²")
notes       String?
createdAt   DateTime
```

#### Occurrence (Ocorrência)
```
id          UUID PK
dailyLogId  UUID FK → DailyLog
companyId   UUID FK → Company
type        Enum (INCIDENTE, ACIDENTE, PARALISACAO, VISITA_TECNICA, OBSERVACAO, OUTRO)
description String
severity    Enum (BAIXA, MEDIA, ALTA, CRITICA)
actionTaken String?
createdById UUID FK → User
createdAt   DateTime
updatedAt   DateTime
```

#### Attachment (Anexo)
```
id          UUID PK
companyId   UUID FK → Company
entityType  Enum (DAILY_LOG, ACTIVITY, WORKSITE, OCCURRENCE)
entityId    UUID
fileName    String
fileSize    Int
mimeType    String
storageKey  String   (chave no S3/R2)
url         String   (URL pré-assinada ou pública)
uploadedById UUID FK → User
createdAt   DateTime
```

#### Photo (Foto — extends Attachment)
```
id          UUID PK
attachmentId UUID FK → Attachment
caption     String?
lat         Decimal?
lng         Decimal?
takenAt     DateTime?
```

#### Comment (Comentário)
```
id          UUID PK
companyId   UUID FK → Company
entityType  Enum (DAILY_LOG, ACTIVITY, OCCURRENCE)
entityId    UUID
content     String
createdById UUID FK → User
createdAt   DateTime
updatedAt   DateTime
isDeleted   Boolean DEFAULT false
```

#### AuditLog (Trilha de Auditoria)
```
id          UUID PK
companyId   UUID FK → Company?
userId      UUID FK → User?
action      String   (ex: "daily_log.approved", "user.created")
entityType  String
entityId    UUID?
payload     JSON?    (diff ou snapshot)
ipAddress   String
userAgent   String
createdAt   DateTime
```

---

## 6. Regras de Negócio

### 6.1 Diário de Obra

- **RN-01:** Só pode existir um diário por obra por data. Tentativa de criar um segundo retorna erro 409.
- **RN-02:** Diários com status APROVADO não podem ser editados. Somente SUPER_ADMIN pode reverter para SUBMETIDO.
- **RN-03:** Um diário só pode ser aprovado pelo ADMIN_EMPRESA ou GESTOR_OBRA com papel de aprovador da obra.
- **RN-04:** A data do diário não pode ser futura.
- **RN-05:** Ao submeter um diário, o sistema registra `submittedAt` e o `createdById`.
- **RN-06:** Diários em RASCUNHO por mais de 7 dias geram alerta para o ADMIN_EMPRESA (pós-MVP: notificação).

### 6.2 Obras

- **RN-07:** Uma obra só pode ser criada por ADMIN_EMPRESA ou SUPER_ADMIN.
- **RN-08:** A data de início não pode ser posterior à data de fim prevista.
- **RN-09:** Uma obra CANCELADA ou CONCLUÍDA não aceita novos diários.
- **RN-10:** O CLIENTE_SINDICO só pode visualizar obras às quais foi explicitamente associado.

### 6.3 Usuários e Acessos

- **RN-11:** Um usuário pertence a exatamente uma empresa (tenant). Não há usuário compartilhado entre tenants.
- **RN-12:** O convite de usuário expira em 72 horas.
- **RN-13:** Um usuário pode ter papel diferente em obras distintas (ex: GESTOR em obra A, COLABORADOR em obra B).
- **RN-14:** SUPER_ADMIN não está vinculado a nenhuma empresa; acessa todos os tenants.
- **RN-15:** A desativação de usuário (`isActive = false`) não exclui seus registros históricos.

### 6.4 Fotos e Anexos

- **RN-16:** Tamanho máximo por foto: 20 MB. Tamanho máximo por PDF: 50 MB.
- **RN-17:** Formatos aceitos de foto: JPEG, PNG, WebP, HEIC.
- **RN-18:** Formatos aceitos de documento: PDF, DWG, DXF, XLSX.
- **RN-19:** URLs de storage são pré-assinadas com TTL de 1 hora para arquivos privados.
- **RN-20:** Fotos de diários APROVADOS não podem ser excluídas (apenas ocultadas por SUPER_ADMIN).

### 6.5 Relatórios

- **RN-21:** Relatório PDF só pode ser gerado para diários com status APROVADO.
- **RN-22:** O CLIENTE_SINDICO pode gerar relatório somente das obras associadas a ele.
- **RN-23:** O relatório consolida: dados da obra, condições climáticas, atividades, mão de obra, materiais, ocorrências e fotos selecionadas.

---

## 7. Perfis de Acesso e Permissões

### 7.1 Matriz de Permissões

| Recurso | SUPER_ADMIN | ADMIN_EMPRESA | GESTOR_OBRA | COLABORADOR | CLIENTE_SINDICO |
|---|---|---|---|---|---|
| Gerenciar empresas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar usuários da empresa | ✅ | ✅ | ❌ | ❌ | ❌ |
| Criar/editar obras | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver todas as obras da empresa | ✅ | ✅ | obras associadas | obras associadas | obras associadas |
| Criar diário | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar diário (RASCUNHO) | ✅ | ✅ | ✅ | próprios | ❌ |
| Submeter diário | ✅ | ✅ | ✅ | ❌ | ❌ |
| Aprovar diário | ✅ | ✅ | ✅ (se designado) | ❌ | ❌ |
| Ver diários aprovados | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fazer upload de fotos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Excluir fotos | ✅ | ✅ | próprias | próprias | ❌ |
| Gerar relatório PDF | ✅ | ✅ | ✅ | ❌ | ✅ (obras assoc.) |
| Ver auditoria | ✅ | ✅ (própria empresa) | ❌ | ❌ | ❌ |
| Comentar | ✅ | ✅ | ✅ | ✅ | ✅ (leitura) |

### 7.2 Implementação de Autorização

Autorização é implementada em duas camadas:

1. **Middleware Next.js** — valida JWT e redireciona não autenticados
2. **Funções `can()` no servidor** — verificam permissões de recurso antes de cada operação

```typescript
// Exemplo de verificação de permissão
async function canApproveDailyLog(userId: string, dailyLogId: string): Promise<boolean> {
  const user = await getUserWithRole(userId);
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_EMPRESA') return true;
  if (user.role === 'GESTOR_OBRA') {
    return isUserAssignedToWorksite(userId, dailyLog.worksiteId);
  }
  return false;
}
```

---

## 8. Estratégia de Segurança

### 8.1 Autenticação

- Senhas armazenadas com **bcrypt** (cost factor 12)
- Tokens JWT com TTL de 15 minutos (access) + 7 dias (refresh via cookie HttpOnly)
- Proteção contra brute-force: rate limit de 5 tentativas/minuto por IP
- CSRF: tokens SameSite=Strict nos cookies de sessão
- MFA: TOTP (Google Authenticator) planejado para v1.1

### 8.2 Comunicação

- HTTPS obrigatório; HSTS com `max-age=31536000; includeSubDomains`
- Certificado TLS gerenciado pelo provedor de hospedagem (Let's Encrypt ou ACM)
- Headers de segurança via Next.js config: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`

### 8.3 Dados em Repouso

- Banco de dados com encryption at rest (recurso do provedor gerenciado)
- Campos sensíveis (CPF de colaboradores) criptografados no nível da aplicação com AES-256-GCM

### 8.4 Isolamento de Tenant

- Toda query ao banco inclui `companyId` no WHERE
- Middleware valida que o `companyId` do JWT coincide com o recurso solicitado
- Testes de penetração incluem tentativas de cross-tenant data leak

### 8.5 Upload de Arquivos

- Validação de MIME type no servidor (não apenas extensão)
- Antivírus scan via ClamAV ou serviço gerenciado antes de tornar o arquivo acessível
- Arquivos armazenados fora do webroot (bucket privado)
- URLs pré-assinadas com TTL curto (1 hora)

### 8.6 Dependências

- `npm audit` executado em cada PR
- Dependências fixadas com versão exata no `package.json`
- Renovate ou Dependabot configurado para atualizações automáticas de segurança

---

## 9. Estratégia LGPD

### 9.1 Base Legal

O tratamento de dados pessoais se baseia em:
- **Art. 7º, II** — execução de contrato (dados dos colaboradores de obras)
- **Art. 7º, V** — legítimo interesse (logs de auditoria)
- **Art. 7º, I** — consentimento (comunicações de marketing)

### 9.2 Dados Pessoais Tratados

| Categoria | Dado | Finalidade | Retenção |
|---|---|---|---|
| Identificação | Nome, e-mail | Autenticação, comunicação | Contrato + 5 anos |
| Contato | Telefone | Suporte | Contrato + 5 anos |
| Acesso | IP, user agent | Segurança, auditoria | 12 meses |
| Localização | GPS de fotos | Evidência documental | Contrato + 5 anos |
| Biométrico | — | Não coletado | — |

### 9.3 Direitos do Titular (Art. 18)

O sistema provê interface para que o ADMIN_EMPRESA atenda pedidos de:
- **Acesso:** exportação de todos os dados do usuário em JSON
- **Correção:** edição via painel de usuário
- **Eliminação:** anonimização de dados pessoais (não exclusão de registros auditáveis)
- **Portabilidade:** download em formato aberto (JSON/CSV)

### 9.4 DPO

Empresa deve nomear DPO e registrar contato na plataforma. Template de Política de Privacidade fornecido no onboarding.

---

## 10. Estratégia de Backup

- **Frequência:** backup automático diário do banco PostgreSQL (snapshot)
- **Retenção:** 30 dias de backups diários + backups semanais por 12 meses
- **Storage de backup:** bucket separado, região diferente (cross-region replication)
- **Teste de restauração:** procedimento de restore testado mensalmente
- **RTO (Recovery Time Objective):** 4 horas
- **RPO (Recovery Point Objective):** 24 horas
- **Arquivos/Fotos:** replicação automática no R2/S3 com versionamento habilitado

---

## 11. Logs e Auditoria

### 11.1 O que é Auditado

| Ação | Entidade | Nível |
|---|---|---|
| Login / Logout | User | INFO |
| Login falho | User | WARN |
| Criação de obra | Worksite | INFO |
| Aprovação de diário | DailyLog | INFO |
| Upload de arquivo | Attachment | INFO |
| Exclusão de usuário | User | WARN |
| Alteração de permissão | User | WARN |
| Acesso cross-tenant (tentativa) | — | ERROR |

### 11.2 Estrutura do Log de Aplicação

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "INFO",
  "action": "daily_log.approved",
  "userId": "uuid",
  "companyId": "uuid",
  "entityType": "DailyLog",
  "entityId": "uuid",
  "ipAddress": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "payload": { "status": "APROVADO", "previousStatus": "SUBMETIDO" }
}
```

### 11.3 Retenção de Logs

- Logs de auditoria: **5 anos** (exigência LGPD + contratos de obra)
- Logs de acesso: **12 meses**
- Logs de erro/infra: **90 dias**

---

## 12. Critérios de Aceite

### CA-01 — Autenticação
- [ ] Usuário pode se registrar com e-mail válido e senha forte (mínimo 8 caracteres, 1 maiúscula, 1 número)
- [ ] Login retorna JWT e cookie de sessão
- [ ] Recuperação de senha envia e-mail com link válido por 1 hora
- [ ] 5 tentativas de login falhas bloqueiam o IP por 5 minutos

### CA-02 — Diário de Obra
- [ ] Criação de diário com data duplicada retorna erro 409
- [ ] Aprovação de diário RASCUNHO (sem submissão) retorna erro 422
- [ ] Diário APROVADO não pode ser editado via API
- [ ] Upload de foto armazena no R2 e retorna URL acessível

### CA-03 — Multitenancy
- [ ] Usuário do tenant A não consegue acessar dados do tenant B (retorna 403)
- [ ] Queries ao banco sempre incluem `companyId` (validado por testes de integração)

### CA-04 — Relatório PDF
- [ ] PDF gerado contém logo da empresa, dados da obra, período e dados do diário
- [ ] PDF de diário em RASCUNHO retorna erro 422

### CA-05 — Desempenho
- [ ] Listagem de diários de uma obra (100 registros) responde em < 500ms (teste de carga)
- [ ] Upload de foto de 5 MB completa em < 10s em conexão 10 Mbps

---

## 13. Plano de Implementação por Fases

| Fase | Entregável | Estimativa |
|---|---|---|
| 1 | Setup, banco, autenticação, RBAC básico | 2 semanas |
| 2 | Área administrativa (empresa, usuários, obras) | 2 semanas |
| 3 | Diário de obra (CRUD, status, aprovação) | 3 semanas |
| 4 | Fotos, anexos, comentários | 2 semanas |
| 5 | Portal cliente/síndico | 1 semana |
| 6 | Relatórios PDF | 2 semanas |
| 7 | Segurança, LGPD, auditoria completa | 2 semanas |
| 8 | Testes, CI/CD, deploy produção | 2 semanas |
| **Total** | | **~16 semanas** |

Ver detalhamento em [tasks.md](./tasks.md).
