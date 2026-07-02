# Modelo de Dados — Diário de Obras SaaS

**Versão:** 1.0.0  
**Data:** 2025  
**Banco:** PostgreSQL 16+  
**ORM:** Prisma 5+  

---

## Sumário

1. [Diagrama ER](#1-diagrama-er)
2. [Entidades](#2-entidades)
3. [Relacionamentos](#3-relacionamentos)
4. [Índices Recomendados](#4-índices-recomendados)
5. [Schema Prisma Completo](#5-schema-prisma-completo)
6. [Justificativas de Design](#6-justificativas-de-design)

---

## 1. Diagrama ER

```
Company ──< User
   │           │
   │           └──< WorksiteUser >── Worksite
   │                                    │
   └──────────────────────────────< DailyLog
                                        │
                              ┌─────────┼──────────┐
                              │         │          │
                           Activity  Labor     Material
                              │
                           Occurrence
                              │
                         Attachment ──< Photo
                              │
                           Comment
                              │
                          AuditLog
```

---

## 2. Entidades

### 2.1 Company

Representa um tenant (empresa cliente da plataforma).

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| name | VARCHAR(255) | NOT NULL | Razão social ou nome fantasia |
| cnpj | VARCHAR(18) | UNIQUE, NOT NULL | CNPJ formatado (XX.XXX.XXX/XXXX-XX) |
| slug | VARCHAR(63) | UNIQUE, NOT NULL | Identificador URL-friendly |
| plan | ENUM | NOT NULL | STARTER, PRO, ENTERPRISE |
| status | ENUM | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, SUSPENDED, CANCELLED |
| logoUrl | TEXT | NULLABLE | URL do logo no R2/S3 |
| logoStorageKey | TEXT | NULLABLE | Chave interna no storage |
| maxWorksites | INT | NOT NULL, DEFAULT 3 | Limite de obras (por plano) |
| maxUsers | INT | NOT NULL, DEFAULT 5 | Limite de usuários (por plano) |
| trialEndsAt | TIMESTAMPTZ | NULLABLE | Fim do período de trial |
| createdAt | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de criação |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

**Enum `CompanyPlan`:** `STARTER`, `PRO`, `ENTERPRISE`  
**Enum `CompanyStatus`:** `ACTIVE`, `SUSPENDED`, `CANCELLED`

---

### 2.2 User

Usuário da plataforma. Pertence a exatamente uma empresa.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| companyId | UUID | FK → Company, NOT NULL | Tenant do usuário |
| email | VARCHAR(255) | UNIQUE, NOT NULL | E-mail (login) |
| passwordHash | VARCHAR(255) | NOT NULL | Hash bcrypt (cost 12) |
| name | VARCHAR(255) | NOT NULL | Nome completo |
| phone | VARCHAR(20) | NULLABLE | Telefone com DDD |
| avatarUrl | TEXT | NULLABLE | URL do avatar |
| avatarStorageKey | TEXT | NULLABLE | Chave interna do avatar |
| role | ENUM | NOT NULL | Papel global na plataforma |
| isActive | BOOLEAN | NOT NULL, DEFAULT TRUE | Ativo/desativado |
| emailVerifiedAt | TIMESTAMPTZ | NULLABLE | Data de verificação do e-mail |
| lastLoginAt | TIMESTAMPTZ | NULLABLE | Último login |
| passwordChangedAt | TIMESTAMPTZ | NULLABLE | Última troca de senha |
| createdAt | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de criação |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

**Enum `UserRole`:** `SUPER_ADMIN`, `ADMIN_EMPRESA`, `GESTOR_OBRA`, `COLABORADOR`, `CLIENTE_SINDICO`

> SUPER_ADMIN tem companyId nulo (usuário da operadora, não de tenant).

---

### 2.3 PasswordResetToken

Tokens temporários para recuperação de senha.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| userId | UUID | FK → User | Proprietário |
| tokenHash | VARCHAR(255) | NOT NULL | SHA-256 do token enviado por e-mail |
| expiresAt | TIMESTAMPTZ | NOT NULL | Expiração (NOW + 1h) |
| usedAt | TIMESTAMPTZ | NULLABLE | Quando foi utilizado |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |

---

### 2.4 InviteToken

Convites enviados por e-mail para novos usuários.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| companyId | UUID | FK → Company | Empresa que convida |
| invitedByUserId | UUID | FK → User | Usuário que enviou o convite |
| email | VARCHAR(255) | NOT NULL | E-mail do convidado |
| role | ENUM (UserRole) | NOT NULL | Papel a ser atribuído |
| tokenHash | VARCHAR(255) | UNIQUE, NOT NULL | Hash do token |
| expiresAt | TIMESTAMPTZ | NOT NULL | NOW + 72h |
| acceptedAt | TIMESTAMPTZ | NULLABLE | Data de aceite |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |

---

### 2.5 Worksite (Obra)

Representa uma obra cadastrada no sistema.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| companyId | UUID | FK → Company, NOT NULL | Tenant proprietário |
| name | VARCHAR(255) | NOT NULL | Nome/identificação da obra |
| address | VARCHAR(500) | NOT NULL | Logradouro + número |
| neighborhood | VARCHAR(255) | NULLABLE | Bairro |
| city | VARCHAR(255) | NOT NULL | Cidade |
| state | CHAR(2) | NOT NULL | UF (ex: SP, RJ) |
| cep | VARCHAR(10) | NOT NULL | CEP formatado |
| lat | DECIMAL(10,8) | NULLABLE | Latitude (geolocalização) |
| lng | DECIMAL(11,8) | NULLABLE | Longitude (geolocalização) |
| artNumber | VARCHAR(50) | NULLABLE | Número da ART/RRT |
| artDocumentUrl | TEXT | NULLABLE | URL do documento da ART |
| responsibleName | VARCHAR(255) | NOT NULL | Nome do responsável técnico |
| responsibleCrea | VARCHAR(50) | NULLABLE | CREA/CAU do responsável |
| startDate | DATE | NOT NULL | Data de início |
| endDateForecast | DATE | NULLABLE | Previsão de conclusão |
| endDateActual | DATE | NULLABLE | Conclusão real |
| status | ENUM | NOT NULL, DEFAULT 'PLANEJAMENTO' | Status atual |
| description | TEXT | NULLABLE | Descrição/escopo da obra |
| clientName | VARCHAR(255) | NULLABLE | Nome do cliente |
| contractNumber | VARCHAR(100) | NULLABLE | Número do contrato |
| totalArea | DECIMAL(10,2) | NULLABLE | Área total em m² |
| createdById | UUID | FK → User, NOT NULL | Quem criou |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

**Enum `WorksiteStatus`:** `PLANEJAMENTO`, `EM_ANDAMENTO`, `PAUSADA`, `CONCLUIDA`, `CANCELADA`

---

### 2.6 WorksiteUser

Tabela de junção entre Obra e Usuário, com papel específico na obra.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| worksiteId | UUID | FK → Worksite, NOT NULL | Obra |
| userId | UUID | FK → User, NOT NULL | Usuário |
| companyId | UUID | FK → Company, NOT NULL | Tenant (desnormalizado para queries) |
| role | ENUM | NOT NULL | Papel nesta obra específica |
| assignedAt | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data de associação |
| assignedById | UUID | FK → User, NOT NULL | Quem fez a associação |

**Constraint única:** `UNIQUE(worksiteId, userId)`

---

### 2.7 DailyLog (Diário de Obra)

Registro diário de uma obra. Único por obra por data.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| worksiteId | UUID | FK → Worksite, NOT NULL | Obra |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| date | DATE | NOT NULL | Data do diário |
| weatherMorning | ENUM | NULLABLE | Clima pela manhã |
| weatherAfternoon | ENUM | NULLABLE | Clima à tarde |
| weatherEvening | ENUM | NULLABLE | Clima à noite |
| tempMin | DECIMAL(4,1) | NULLABLE | Temperatura mínima (°C) |
| tempMax | DECIMAL(4,1) | NULLABLE | Temperatura máxima (°C) |
| workedHours | DECIMAL(4,1) | NULLABLE | Horas trabalhadas no dia |
| notes | TEXT | NULLABLE | Observações gerais |
| status | ENUM | NOT NULL, DEFAULT 'RASCUNHO' | Status do diário |
| createdById | UUID | FK → User, NOT NULL | Quem criou |
| submittedAt | TIMESTAMPTZ | NULLABLE | Data/hora de submissão |
| submittedById | UUID | FK → User, NULLABLE | Quem submeteu |
| approvedAt | TIMESTAMPTZ | NULLABLE | Data/hora de aprovação |
| approvedById | UUID | FK → User, NULLABLE | Quem aprovou |
| rejectedAt | TIMESTAMPTZ | NULLABLE | Data/hora de rejeição |
| rejectedById | UUID | FK → User, NULLABLE | Quem rejeitou |
| rejectionReason | TEXT | NULLABLE | Motivo da rejeição |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação do registro |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

**Enum `WeatherCondition`:** `ENSOLARADO`, `NUBLADO`, `PARCIALMENTE_NUBLADO`, `CHUVOSO`, `TEMPESTADE`, `NEVE`, `VENTO_FORTE`, `NEBLINA`  
**Enum `DailyLogStatus`:** `RASCUNHO`, `SUBMETIDO`, `APROVADO`, `REJEITADO`  
**Constraint única:** `UNIQUE(worksiteId, date)`

---

### 2.8 Activity (Atividade)

Atividades registradas em um diário de obra.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| dailyLogId | UUID | FK → DailyLog, NOT NULL | Diário pai |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| description | TEXT | NOT NULL | Descrição da atividade executada |
| location | VARCHAR(255) | NULLABLE | Local específico na obra (ex: "Bloco A, 3º andar") |
| progress | DECIMAL(5,2) | NULLABLE | Percentual de progresso (0.00 a 100.00) |
| unit | VARCHAR(50) | NULLABLE | Unidade de medição (ex: m², m³) |
| quantity | DECIMAL(10,2) | NULLABLE | Quantidade executada |
| notes | TEXT | NULLABLE | Observações da atividade |
| order | INT | NOT NULL, DEFAULT 0 | Ordem de exibição |
| createdById | UUID | FK → User, NOT NULL | Responsável |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

---

### 2.9 Labor (Mão de Obra)

Registro de mão de obra por turno e função no diário.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| dailyLogId | UUID | FK → DailyLog, NOT NULL | Diário pai |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| role | VARCHAR(100) | NOT NULL | Função (ex: "Pedreiro", "Eletricista") |
| quantity | SMALLINT | NOT NULL | Quantidade de trabalhadores |
| shift | ENUM | NOT NULL | Turno de trabalho |
| contractor | VARCHAR(255) | NULLABLE | Empresa subcontratada |
| notes | TEXT | NULLABLE | Observações |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |

**Enum `WorkShift`:** `MANHA`, `TARDE`, `NOITE`, `INTEGRAL`

---

### 2.10 Material

Materiais utilizados registrados no diário.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| dailyLogId | UUID | FK → DailyLog, NOT NULL | Diário pai |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| name | VARCHAR(255) | NOT NULL | Nome do material |
| quantity | DECIMAL(12,3) | NOT NULL | Quantidade |
| unit | VARCHAR(20) | NOT NULL | Unidade (m², m³, kg, un, L, saco) |
| notes | TEXT | NULLABLE | Observações |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |

---

### 2.11 Occurrence (Ocorrência)

Incidentes, paralisações e eventos relevantes do dia.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| dailyLogId | UUID | FK → DailyLog, NOT NULL | Diário pai |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| type | ENUM | NOT NULL | Tipo da ocorrência |
| severity | ENUM | NOT NULL, DEFAULT 'BAIXA' | Severidade |
| description | TEXT | NOT NULL | Descrição detalhada |
| actionTaken | TEXT | NULLABLE | Ação tomada |
| isResolved | BOOLEAN | NOT NULL, DEFAULT FALSE | Ocorrência resolvida? |
| resolvedAt | TIMESTAMPTZ | NULLABLE | Data de resolução |
| createdById | UUID | FK → User, NOT NULL | Quem registrou |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

**Enum `OccurrenceType`:** `INCIDENTE`, `ACIDENTE`, `PARALISACAO`, `VISITA_TECNICA`, `INSPECAO`, `OBSERVACAO`, `OUTRO`  
**Enum `OccurrenceSeverity`:** `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`

---

### 2.12 Attachment (Anexo)

Metadados de arquivos armazenados no R2/S3.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| entityType | ENUM | NOT NULL | Tipo de entidade relacionada |
| entityId | UUID | NOT NULL | ID da entidade relacionada |
| fileName | VARCHAR(500) | NOT NULL | Nome original do arquivo |
| fileSize | BIGINT | NOT NULL | Tamanho em bytes |
| mimeType | VARCHAR(127) | NOT NULL | MIME type (ex: image/jpeg) |
| storageKey | TEXT | NOT NULL | Chave no bucket R2/S3 |
| isPublic | BOOLEAN | NOT NULL, DEFAULT FALSE | URL pública ou pré-assinada |
| uploadedById | UUID | FK → User, NOT NULL | Quem fez upload |
| deletedAt | TIMESTAMPTZ | NULLABLE | Soft delete |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |

**Enum `AttachmentEntityType`:** `DAILY_LOG`, `ACTIVITY`, `OCCURRENCE`, `WORKSITE`, `USER`

---

### 2.13 Photo (Foto)

Extensão de Attachment para fotos com metadados adicionais.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| attachmentId | UUID | FK → Attachment, UNIQUE | Anexo base |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| caption | TEXT | NULLABLE | Legenda da foto |
| lat | DECIMAL(10,8) | NULLABLE | Latitude (EXIF GPS) |
| lng | DECIMAL(11,8) | NULLABLE | Longitude (EXIF GPS) |
| takenAt | TIMESTAMPTZ | NULLABLE | Data/hora do disparo (EXIF) |
| thumbnailStorageKey | TEXT | NULLABLE | Chave da thumbnail gerada |
| width | INT | NULLABLE | Largura em pixels |
| height | INT | NULLABLE | Altura em pixels |
| order | INT | NOT NULL, DEFAULT 0 | Ordem de exibição |

---

### 2.14 Comment (Comentário)

Comentários em entidades do sistema.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| companyId | UUID | FK → Company, NOT NULL | Tenant |
| entityType | ENUM | NOT NULL | Tipo de entidade |
| entityId | UUID | NOT NULL | ID da entidade |
| content | TEXT | NOT NULL | Conteúdo do comentário |
| createdById | UUID | FK → User, NOT NULL | Autor |
| isDeleted | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete |
| deletedAt | TIMESTAMPTZ | NULLABLE | Data de exclusão |
| createdAt | TIMESTAMPTZ | NOT NULL | Data de criação |
| updatedAt | TIMESTAMPTZ | NOT NULL | Data de atualização |

**Enum `CommentEntityType`:** `DAILY_LOG`, `ACTIVITY`, `OCCURRENCE`

---

### 2.15 AuditLog (Trilha de Auditoria)

Registro imutável de todas as ações relevantes do sistema.

| Campo | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | UUID | PK | Identificador único |
| companyId | UUID | NULLABLE | Tenant (nulo para ações de SUPER_ADMIN) |
| userId | UUID | NULLABLE | Usuário que executou a ação |
| userEmail | VARCHAR(255) | NULLABLE | E-mail no momento da ação (desnorm.) |
| action | VARCHAR(100) | NOT NULL | Código da ação (ex: daily_log.approved) |
| entityType | VARCHAR(100) | NOT NULL | Tipo da entidade afetada |
| entityId | UUID | NULLABLE | ID da entidade afetada |
| payload | JSONB | NULLABLE | Dados contextuais / diff |
| ipAddress | INET | NOT NULL | Endereço IP |
| userAgent | TEXT | NOT NULL | User agent do cliente |
| createdAt | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp do evento |

> **Design:** AuditLog é append-only. Nenhum UPDATE ou DELETE deve ser permitido nesta tabela em produção. Considere uma policy PostgreSQL para reforçar isso.

---

## 3. Relacionamentos

```
Company 1──N User               (um tenant tem muitos usuários)
Company 1──N Worksite           (um tenant tem muitas obras)
Company 1──N DailyLog           (um tenant tem muitos diários)
User    N──N Worksite            via WorksiteUser (usuário associado a obras)
Worksite 1──N DailyLog          (uma obra tem muitos diários)
DailyLog 1──N Activity          (um diário tem muitas atividades)
DailyLog 1──N Labor             (um diário tem registros de mão de obra)
DailyLog 1──N Material          (um diário tem materiais utilizados)
DailyLog 1──N Occurrence        (um diário tem ocorrências)
DailyLog 1──N Attachment        via entityType='DAILY_LOG'
Activity 1──N Attachment        via entityType='ACTIVITY'
Attachment 1──1 Photo           (extensão opcional para fotos)
DailyLog 1──N Comment           via entityType='DAILY_LOG'
Activity 1──N Comment           via entityType='ACTIVITY'
User    1──N AuditLog            (usuário gerou ações auditadas)
Company 1──N AuditLog           (tenant das ações auditadas)
```

---

## 4. Índices Recomendados

```sql
-- Multitenancy: queries por tenant são o padrão
CREATE INDEX idx_user_company ON "User"("companyId");
CREATE INDEX idx_worksite_company ON "Worksite"("companyId");
CREATE INDEX idx_daily_log_company ON "DailyLog"("companyId");
CREATE INDEX idx_audit_log_company ON "AuditLog"("companyId");

-- Lookup de diários por obra e data (query mais comum)
CREATE UNIQUE INDEX idx_daily_log_worksite_date ON "DailyLog"("worksiteId", "date");

-- Lookup de usuários por e-mail (login)
CREATE UNIQUE INDEX idx_user_email ON "User"("email");

-- Attachment por entidade
CREATE INDEX idx_attachment_entity ON "Attachment"("entityType", "entityId");

-- Comment por entidade
CREATE INDEX idx_comment_entity ON "Comment"("entityType", "entityId");

-- AuditLog por ação e entidade
CREATE INDEX idx_audit_log_action ON "AuditLog"("action");
CREATE INDEX idx_audit_log_entity ON "AuditLog"("entityType", "entityId");
CREATE INDEX idx_audit_log_user ON "AuditLog"("userId");
CREATE INDEX idx_audit_log_created ON "AuditLog"("createdAt" DESC);

-- WorksiteUser lookup
CREATE UNIQUE INDEX idx_worksite_user ON "WorksiteUser"("worksiteId", "userId");
CREATE INDEX idx_worksite_user_company ON "WorksiteUser"("companyId");

-- Tokens
CREATE UNIQUE INDEX idx_invite_token_hash ON "InviteToken"("tokenHash");
CREATE INDEX idx_invite_token_email ON "InviteToken"("email");
CREATE INDEX idx_password_reset_user ON "PasswordResetToken"("userId");

-- Filtros comuns em obras
CREATE INDEX idx_worksite_status ON "Worksite"("companyId", "status");
CREATE INDEX idx_worksite_responsible ON "Worksite"("companyId", "createdById");

-- Filtros comuns em diários
CREATE INDEX idx_daily_log_status ON "DailyLog"("worksiteId", "status");
CREATE INDEX idx_daily_log_date_range ON "DailyLog"("worksiteId", "date" DESC);
```

---

## 5. Schema Prisma Completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum CompanyPlan {
  STARTER
  PRO
  ENTERPRISE
}

enum CompanyStatus {
  ACTIVE
  SUSPENDED
  CANCELLED
}

enum UserRole {
  SUPER_ADMIN
  ADMIN_EMPRESA
  GESTOR_OBRA
  COLABORADOR
  CLIENTE_SINDICO
}

enum WorksiteStatus {
  PLANEJAMENTO
  EM_ANDAMENTO
  PAUSADA
  CONCLUIDA
  CANCELADA
}

enum WeatherCondition {
  ENSOLARADO
  NUBLADO
  PARCIALMENTE_NUBLADO
  CHUVOSO
  TEMPESTADE
  NEVE
  VENTO_FORTE
  NEBLINA
}

enum DailyLogStatus {
  RASCUNHO
  SUBMETIDO
  APROVADO
  REJEITADO
}

enum WorkShift {
  MANHA
  TARDE
  NOITE
  INTEGRAL
}

enum OccurrenceType {
  INCIDENTE
  ACIDENTE
  PARALISACAO
  VISITA_TECNICA
  INSPECAO
  OBSERVACAO
  OUTRO
}

enum OccurrenceSeverity {
  BAIXA
  MEDIA
  ALTA
  CRITICA
}

enum AttachmentEntityType {
  DAILY_LOG
  ACTIVITY
  OCCURRENCE
  WORKSITE
  USER
}

enum CommentEntityType {
  DAILY_LOG
  ACTIVITY
  OCCURRENCE
}

// ─── Models ───────────────────────────────────────────────────────────────────

model Company {
  id              String        @id @default(uuid())
  name            String        @db.VarChar(255)
  cnpj            String        @unique @db.VarChar(18)
  slug            String        @unique @db.VarChar(63)
  plan            CompanyPlan   @default(STARTER)
  status          CompanyStatus @default(ACTIVE)
  logoUrl         String?
  logoStorageKey  String?
  maxWorksites    Int           @default(3)
  maxUsers        Int           @default(5)
  trialEndsAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  users           User[]
  worksites       Worksite[]
  dailyLogs       DailyLog[]
  auditLogs       AuditLog[]
  inviteTokens    InviteToken[]
  worksiteUsers   WorksiteUser[]
}

model User {
  id                  String    @id @default(uuid())
  companyId           String
  email               String    @unique @db.VarChar(255)
  passwordHash        String    @db.VarChar(255)
  name                String    @db.VarChar(255)
  phone               String?   @db.VarChar(20)
  avatarUrl           String?
  avatarStorageKey    String?
  role                UserRole
  isActive            Boolean   @default(true)
  emailVerifiedAt     DateTime?
  lastLoginAt         DateTime?
  passwordChangedAt   DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  company             Company         @relation(fields: [companyId], references: [id])
  worksiteUsers       WorksiteUser[]
  createdWorksites    Worksite[]      @relation("WorksiteCreatedBy")
  createdDailyLogs    DailyLog[]      @relation("DailyLogCreatedBy")
  submittedDailyLogs  DailyLog[]      @relation("DailyLogSubmittedBy")
  approvedDailyLogs   DailyLog[]      @relation("DailyLogApprovedBy")
  rejectedDailyLogs   DailyLog[]      @relation("DailyLogRejectedBy")
  createdActivities   Activity[]
  createdOccurrences  Occurrence[]
  uploadedAttachments Attachment[]
  comments            Comment[]
  auditLogs           AuditLog[]
  passwordResetTokens PasswordResetToken[]
  sentInvites         InviteToken[]

  @@index([companyId])
}

model PasswordResetToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String    @db.VarChar(255)
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model InviteToken {
  id              String    @id @default(uuid())
  companyId       String
  invitedByUserId String
  email           String    @db.VarChar(255)
  role            UserRole
  tokenHash       String    @unique @db.VarChar(255)
  expiresAt       DateTime
  acceptedAt      DateTime?
  createdAt       DateTime  @default(now())

  company         Company   @relation(fields: [companyId], references: [id])
  invitedBy       User      @relation(fields: [invitedByUserId], references: [id])

  @@index([email])
  @@index([companyId])
}

model Worksite {
  id                String         @id @default(uuid())
  companyId         String
  name              String         @db.VarChar(255)
  address           String         @db.VarChar(500)
  neighborhood      String?        @db.VarChar(255)
  city              String         @db.VarChar(255)
  state             String         @db.Char(2)
  cep               String         @db.VarChar(10)
  lat               Decimal?       @db.Decimal(10, 8)
  lng               Decimal?       @db.Decimal(11, 8)
  artNumber         String?        @db.VarChar(50)
  artDocumentUrl    String?
  responsibleName   String         @db.VarChar(255)
  responsibleCrea   String?        @db.VarChar(50)
  startDate         DateTime       @db.Date
  endDateForecast   DateTime?      @db.Date
  endDateActual     DateTime?      @db.Date
  status            WorksiteStatus @default(PLANEJAMENTO)
  description       String?
  clientName        String?        @db.VarChar(255)
  contractNumber    String?        @db.VarChar(100)
  totalArea         Decimal?       @db.Decimal(10, 2)
  createdById       String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  company           Company        @relation(fields: [companyId], references: [id])
  createdBy         User           @relation("WorksiteCreatedBy", fields: [createdById], references: [id])
  worksiteUsers     WorksiteUser[]
  dailyLogs         DailyLog[]

  @@index([companyId])
  @@index([companyId, status])
}

model WorksiteUser {
  id            String    @id @default(uuid())
  worksiteId    String
  userId        String
  companyId     String
  role          UserRole
  assignedAt    DateTime  @default(now())
  assignedById  String

  worksite      Worksite  @relation(fields: [worksiteId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  company       Company   @relation(fields: [companyId], references: [id])

  @@unique([worksiteId, userId])
  @@index([companyId])
  @@index([userId])
}

model DailyLog {
  id                String           @id @default(uuid())
  worksiteId        String
  companyId         String
  date              DateTime         @db.Date
  weatherMorning    WeatherCondition?
  weatherAfternoon  WeatherCondition?
  weatherEvening    WeatherCondition?
  tempMin           Decimal?         @db.Decimal(4, 1)
  tempMax           Decimal?         @db.Decimal(4, 1)
  workedHours       Decimal?         @db.Decimal(4, 1)
  notes             String?
  status            DailyLogStatus   @default(RASCUNHO)
  createdById       String
  submittedAt       DateTime?
  submittedById     String?
  approvedAt        DateTime?
  approvedById      String?
  rejectedAt        DateTime?
  rejectedById      String?
  rejectionReason   String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  worksite          Worksite         @relation(fields: [worksiteId], references: [id])
  company           Company          @relation(fields: [companyId], references: [id])
  createdBy         User             @relation("DailyLogCreatedBy", fields: [createdById], references: [id])
  submittedBy       User?            @relation("DailyLogSubmittedBy", fields: [submittedById], references: [id])
  approvedBy        User?            @relation("DailyLogApprovedBy", fields: [approvedById], references: [id])
  rejectedBy        User?            @relation("DailyLogRejectedBy", fields: [rejectedById], references: [id])
  activities        Activity[]
  laborRecords      Labor[]
  materials         Material[]
  occurrences       Occurrence[]

  @@unique([worksiteId, date])
  @@index([companyId])
  @@index([worksiteId, status])
  @@index([worksiteId, date(sort: Desc)])
}

model Activity {
  id           String    @id @default(uuid())
  dailyLogId   String
  companyId    String
  description  String
  location     String?   @db.VarChar(255)
  progress     Decimal?  @db.Decimal(5, 2)
  unit         String?   @db.VarChar(50)
  quantity     Decimal?  @db.Decimal(10, 2)
  notes        String?
  order        Int       @default(0)
  createdById  String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  dailyLog     DailyLog  @relation(fields: [dailyLogId], references: [id], onDelete: Cascade)
  createdBy    User      @relation(fields: [createdById], references: [id])

  @@index([dailyLogId])
  @@index([companyId])
}

model Labor {
  id           String     @id @default(uuid())
  dailyLogId   String
  companyId    String
  role         String     @db.VarChar(100)
  quantity     Int        @db.SmallInt
  shift        WorkShift
  contractor   String?    @db.VarChar(255)
  notes        String?
  createdAt    DateTime   @default(now())

  dailyLog     DailyLog   @relation(fields: [dailyLogId], references: [id], onDelete: Cascade)

  @@index([dailyLogId])
}

model Material {
  id           String    @id @default(uuid())
  dailyLogId   String
  companyId    String
  name         String    @db.VarChar(255)
  quantity     Decimal   @db.Decimal(12, 3)
  unit         String    @db.VarChar(20)
  notes        String?
  createdAt    DateTime  @default(now())

  dailyLog     DailyLog  @relation(fields: [dailyLogId], references: [id], onDelete: Cascade)

  @@index([dailyLogId])
}

model Occurrence {
  id             String             @id @default(uuid())
  dailyLogId     String
  companyId      String
  type           OccurrenceType
  severity       OccurrenceSeverity @default(BAIXA)
  description    String
  actionTaken    String?
  isResolved     Boolean            @default(false)
  resolvedAt     DateTime?
  createdById    String
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  dailyLog       DailyLog           @relation(fields: [dailyLogId], references: [id], onDelete: Cascade)
  createdBy      User               @relation(fields: [createdById], references: [id])

  @@index([dailyLogId])
  @@index([companyId, type])
}

model Attachment {
  id              String               @id @default(uuid())
  companyId       String
  entityType      AttachmentEntityType
  entityId        String               @db.Uuid
  fileName        String               @db.VarChar(500)
  fileSize        BigInt
  mimeType        String               @db.VarChar(127)
  storageKey      String
  isPublic        Boolean              @default(false)
  uploadedById    String
  deletedAt       DateTime?
  createdAt       DateTime             @default(now())

  uploadedBy      User                 @relation(fields: [uploadedById], references: [id])
  photo           Photo?

  @@index([entityType, entityId])
  @@index([companyId])
}

model Photo {
  id                   String     @id @default(uuid())
  attachmentId         String     @unique
  companyId            String
  caption              String?
  lat                  Decimal?   @db.Decimal(10, 8)
  lng                  Decimal?   @db.Decimal(11, 8)
  takenAt              DateTime?
  thumbnailStorageKey  String?
  width                Int?
  height               Int?
  order                Int        @default(0)

  attachment           Attachment @relation(fields: [attachmentId], references: [id], onDelete: Cascade)

  @@index([companyId])
}

model Comment {
  id           String            @id @default(uuid())
  companyId    String
  entityType   CommentEntityType
  entityId     String            @db.Uuid
  content      String
  createdById  String
  isDeleted    Boolean           @default(false)
  deletedAt    DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  createdBy    User              @relation(fields: [createdById], references: [id])

  @@index([entityType, entityId])
  @@index([companyId])
}

model AuditLog {
  id           String   @id @default(uuid())
  companyId    String?
  userId       String?
  userEmail    String?  @db.VarChar(255)
  action       String   @db.VarChar(100)
  entityType   String   @db.VarChar(100)
  entityId     String?  @db.Uuid
  payload      Json?
  ipAddress    String   @db.Inet
  userAgent    String
  createdAt    DateTime @default(now())

  company      Company? @relation(fields: [companyId], references: [id])
  user         User?    @relation(fields: [userId], references: [id])

  @@index([companyId])
  @@index([userId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt(sort: Desc)])
}
```

---

## 6. Justificativas de Design

### 6.1 UUID vs. Auto-increment

UUIDs são usados como PKs porque:
- Evitam enumeração de recursos em URLs (`/daily-logs/1234` é previsível)
- Facilitam geração de IDs no cliente para operações offline (futuro)
- Não expõem volume de registros da empresa

**Tradeoff:** Índices maiores. Mitigado com `gen_random_uuid()` que é ordenável por tempo na v7 (considerar UUIDv7 no futuro).

### 6.2 companyId Desnormalizado

O campo `companyId` está presente em praticamente todas as tabelas, mesmo que seja derivável por joins. Isso:
- Elimina joins desnecessários para aplicar o tenant guard
- Melhora performance de queries com índice em `(companyId, ...)`
- Facilita particionamento futuro por tenant

### 6.3 Soft Delete

Entidades críticas usam `deletedAt` em vez de DELETE físico para:
- Preservar integridade referencial
- Permitir recuperação de dados
- Manter histórico auditável

### 6.4 Attachment + Photo (herança por composição)

A separação entre `Attachment` (metadados de arquivo) e `Photo` (metadados fotográficos extras) usa composição em vez de tabela única com nullable columns, tornando o schema mais limpo e extensível para outros tipos futuros (ex: `Video`, `Document`).

### 6.5 AuditLog Append-Only

`AuditLog` não tem `updatedAt` e não deve receber UPDATEs. Para reforçar no banco:

```sql
CREATE RULE audit_log_no_update AS ON UPDATE TO "AuditLog" DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO "AuditLog" DO INSTEAD NOTHING;
```
