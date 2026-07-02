# Documentação da API — Diário de Obras SaaS

**Versão:** 1.0.0  
**Base URL:** `https://app.diario-obras.com.br/api`  
**Formato:** JSON  

---

## Sumário

1. [Convenções Gerais](#1-convenções-gerais)
2. [Autenticação e Autorização](#2-autenticação-e-autorização)
3. [Módulo Auth](#3-módulo-auth)
4. [Módulo Companies](#4-módulo-companies)
5. [Módulo Users](#5-módulo-users)
6. [Módulo Worksites](#6-módulo-worksites)
7. [Módulo Daily Logs](#7-módulo-daily-logs)
8. [Módulo Reports](#8-módulo-reports)
9. [Módulo Uploads](#9-módulo-uploads)
10. [Códigos de Erro](#10-códigos-de-erro)

---

## 1. Convenções Gerais

### 1.1 Formato de Requisição e Resposta

- Content-Type: `application/json` para todas as requisições com body
- Datas: ISO 8601 no formato `YYYY-MM-DDTHH:mm:ssZ` (UTC)
- Datas sem hora (ex: data do diário): `YYYY-MM-DD`
- IDs: UUID v4 como string

### 1.2 Paginação

Endpoints de listagem retornam o formato:

```json
{
  "data": [ ... ],
  "meta": {
    "total": 125,
    "page": 1,
    "perPage": 20,
    "totalPages": 7
  }
}
```

Query params de paginação:
- `page` (default: 1)
- `perPage` (default: 20, max: 100)

### 1.3 Ordenação

- `sortBy`: campo para ordenação (ex: `createdAt`, `date`)
- `sortOrder`: `asc` ou `desc` (default: `desc`)

### 1.4 Filtros

Filtros são passados como query params, ex:
```
GET /api/worksites?status=EM_ANDAMENTO&city=São+Paulo
```

### 1.5 Envelope de Resposta de Sucesso

```json
{
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

### 1.6 Envelope de Resposta de Erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados de entrada inválidos",
    "details": [
      { "field": "email", "message": "E-mail inválido" }
    ]
  }
}
```

---

## 2. Autenticação e Autorização

### 2.1 Autenticação via Session Cookie

O sistema usa **Auth.js** com sessão via cookie HttpOnly. Após o login bem-sucedido, o servidor define o cookie `next-auth.session-token` automaticamente.

```
Cookie: next-auth.session-token=<jwt>
```

### 2.2 Autenticação via Bearer Token (API Programática)

Para uso programático, gere um API token no painel (pós-MVP):

```
Authorization: Bearer <api-token>
```

### 2.3 Erros de Autenticação

| HTTP | Código | Situação |
|---|---|---|
| 401 | `UNAUTHORIZED` | Não autenticado (sem sessão válida) |
| 403 | `FORBIDDEN` | Autenticado, mas sem permissão |
| 403 | `TENANT_MISMATCH` | Tentativa de acesso cross-tenant |

---

## 3. Módulo Auth

### POST /api/auth/signin

Login com e-mail e senha.

**Request:**
```json
{
  "email": "joao@construtora.com",
  "password": "MinhaSenh@123"
}
```

**Response 200:**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "João Silva",
      "email": "joao@construtora.com",
      "role": "GESTOR_OBRA",
      "companyId": "7f000001-8c0a-1000-8000-000000000001"
    }
  }
}
```

**Erros:**
- `401 INVALID_CREDENTIALS` — e-mail ou senha incorretos
- `401 ACCOUNT_INACTIVE` — conta desativada
- `429 RATE_LIMIT_EXCEEDED` — muitas tentativas

---

### POST /api/auth/signout

Encerra a sessão atual.

**Response 200:** `{ "message": "Sessão encerrada" }`

---

### POST /api/auth/forgot-password

Solicita e-mail de recuperação de senha.

**Request:**
```json
{ "email": "joao@construtora.com" }
```

**Response 200:** (sempre retorna 200 para não revelar se e-mail existe)
```json
{ "message": "Se o e-mail existir, você receberá as instruções em breve." }
```

---

### POST /api/auth/reset-password

Redefine a senha com token recebido por e-mail.

**Request:**
```json
{
  "token": "abc123...",
  "password": "NovaSenha@456",
  "confirmPassword": "NovaSenha@456"
}
```

**Response 200:** `{ "message": "Senha redefinida com sucesso" }`

**Erros:**
- `422 INVALID_TOKEN` — token inválido ou expirado
- `422 PASSWORDS_DONT_MATCH` — senhas não conferem
- `422 WEAK_PASSWORD` — senha não atende critérios

---

### GET /api/auth/session

Retorna dados da sessão atual.

**Response 200:**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@construtora.com",
      "role": "GESTOR_OBRA",
      "companyId": "uuid",
      "companySlug": "construtora-xyz"
    },
    "expires": "2025-02-15T10:30:00Z"
  }
}
```

---

## 4. Módulo Companies

> Requer: `SUPER_ADMIN` para todas as operações (exceto GET da própria empresa por ADMIN_EMPRESA)

### GET /api/companies

Lista todas as empresas (apenas SUPER_ADMIN).

**Query params:** `status`, `plan`, `page`, `perPage`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Construtora XYZ Ltda",
      "cnpj": "12.345.678/0001-90",
      "slug": "construtora-xyz",
      "plan": "PRO",
      "status": "ACTIVE",
      "createdAt": "2025-01-10T09:00:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "perPage": 20, "totalPages": 3 }
}
```

---

### POST /api/companies

Cria uma nova empresa (tenant). SUPER_ADMIN ou registro público.

**Request:**
```json
{
  "name": "Construtora ABC Ltda",
  "cnpj": "98.765.432/0001-10",
  "slug": "construtora-abc",
  "plan": "STARTER",
  "adminEmail": "admin@construtora-abc.com",
  "adminName": "Maria Souza",
  "adminPassword": "Senha@2025"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Construtora ABC Ltda",
    "slug": "construtora-abc",
    "plan": "STARTER",
    "status": "ACTIVE"
  },
  "message": "Empresa criada com sucesso"
}
```

---

### GET /api/companies/:id

Retorna detalhes de uma empresa. ADMIN_EMPRESA pode ver apenas a própria.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Construtora XYZ Ltda",
    "cnpj": "12.345.678/0001-90",
    "slug": "construtora-xyz",
    "plan": "PRO",
    "status": "ACTIVE",
    "logoUrl": "https://r2.example.com/logos/uuid.png",
    "maxWorksites": 999,
    "maxUsers": 20,
    "createdAt": "2025-01-10T09:00:00Z"
  }
}
```

---

### PATCH /api/companies/:id

Atualiza dados da empresa.

**Request (campos opcionais):**
```json
{
  "name": "Construtora XYZ S.A.",
  "plan": "ENTERPRISE"
}
```

**Response 200:** dados atualizados da empresa.

---

## 5. Módulo Users

### GET /api/users

Lista usuários da empresa autenticada.

**Query params:** `role`, `isActive`, `page`, `perPage`, `search` (nome/e-mail)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Carlos Lima",
      "email": "carlos@construtora.com",
      "role": "GESTOR_OBRA",
      "isActive": true,
      "lastLoginAt": "2025-01-14T08:30:00Z",
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

---

### POST /api/users/invite

Convida um novo usuário por e-mail.

**Request:**
```json
{
  "email": "novo@construtora.com",
  "name": "Fernanda Costa",
  "role": "COLABORADOR"
}
```

**Response 201:**
```json
{
  "data": {
    "inviteId": "uuid",
    "email": "novo@construtora.com",
    "expiresAt": "2025-01-17T10:00:00Z"
  },
  "message": "Convite enviado para novo@construtora.com"
}
```

---

### GET /api/users/:id

Retorna dados de um usuário. Usuário pode ver a si mesmo; ADMIN vê todos.

**Response 200:** dados do usuário sem `passwordHash`.

---

### PATCH /api/users/:id

Atualiza dados do usuário.

**Request:**
```json
{
  "name": "Fernanda Costa Silva",
  "phone": "(11) 99999-8888"
}
```

---

### PATCH /api/users/:id/deactivate

Desativa um usuário (não exclui).

**Requer:** ADMIN_EMPRESA  
**Response 200:** `{ "message": "Usuário desativado com sucesso" }`

---

### PATCH /api/users/:id/change-password

Altera a senha do usuário autenticado.

**Request:**
```json
{
  "currentPassword": "SenhaAtual@123",
  "newPassword": "NovaSenha@456"
}
```

---

## 6. Módulo Worksites

### GET /api/worksites

Lista obras da empresa.

**Query params:** `status`, `city`, `state`, `page`, `perPage`, `search`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Edifício Aurora — Torre A",
      "city": "São Paulo",
      "state": "SP",
      "status": "EM_ANDAMENTO",
      "startDate": "2024-03-01",
      "endDateForecast": "2025-06-30",
      "responsibleName": "Eng. Roberto Matos",
      "totalDailyLogs": 287,
      "createdAt": "2024-02-15T10:00:00Z"
    }
  ],
  "meta": { "total": 8, "page": 1, "perPage": 20, "totalPages": 1 }
}
```

---

### POST /api/worksites

Cria uma nova obra.

**Requer:** ADMIN_EMPRESA

**Request:**
```json
{
  "name": "Residencial Bosque Verde",
  "address": "Rua das Flores, 500",
  "neighborhood": "Jardim Paulista",
  "city": "Campinas",
  "state": "SP",
  "cep": "13000-000",
  "artNumber": "SP-123456",
  "responsibleName": "Eng. Ana Paula Rodrigues",
  "responsibleCrea": "CREA-SP 1234567",
  "startDate": "2025-02-01",
  "endDateForecast": "2026-08-31",
  "clientName": "Condomínio Bosque Verde",
  "contractNumber": "CT-2025-001",
  "totalArea": 15000.00
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Residencial Bosque Verde",
    "status": "PLANEJAMENTO",
    "createdAt": "2025-01-15T09:00:00Z"
  },
  "message": "Obra criada com sucesso"
}
```

---

### GET /api/worksites/:id

Retorna detalhes completos de uma obra.

---

### PATCH /api/worksites/:id

Atualiza dados de uma obra.

---

### PATCH /api/worksites/:id/status

Muda o status da obra.

**Requer:** ADMIN_EMPRESA

**Request:**
```json
{ "status": "EM_ANDAMENTO" }
```

---

### GET /api/worksites/:id/users

Lista usuários associados à obra.

**Response 200:**
```json
{
  "data": [
    {
      "userId": "uuid",
      "name": "Carlos Lima",
      "email": "carlos@construtora.com",
      "role": "GESTOR_OBRA",
      "assignedAt": "2025-01-10T10:00:00Z"
    }
  ]
}
```

---

### POST /api/worksites/:id/users

Associa um usuário à obra.

**Requer:** ADMIN_EMPRESA

**Request:**
```json
{
  "userId": "uuid",
  "role": "GESTOR_OBRA"
}
```

---

### DELETE /api/worksites/:id/users/:userId

Remove usuário da obra.

---

## 7. Módulo Daily Logs

### GET /api/worksites/:worksiteId/daily-logs

Lista diários de uma obra.

**Query params:** `status`, `dateFrom`, `dateTo`, `page`, `perPage`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2025-01-15",
      "status": "APROVADO",
      "weatherMorning": "ENSOLARADO",
      "weatherAfternoon": "NUBLADO",
      "workedHours": 8.5,
      "totalActivities": 5,
      "totalLabor": 32,
      "totalOccurrences": 1,
      "totalPhotos": 12,
      "createdBy": { "id": "uuid", "name": "Carlos Lima" },
      "approvedBy": { "id": "uuid", "name": "Maria Souza" },
      "approvedAt": "2025-01-15T18:00:00Z"
    }
  ],
  "meta": { "total": 45, "page": 1, "perPage": 20, "totalPages": 3 }
}
```

---

### POST /api/worksites/:worksiteId/daily-logs

Cria um novo diário de obra.

**Request:**
```json
{
  "date": "2025-01-16",
  "weatherMorning": "ENSOLARADO",
  "weatherAfternoon": "CHUVOSO",
  "tempMin": 18.5,
  "tempMax": 28.0,
  "workedHours": 7.0,
  "notes": "Trabalhos interrompidos à tarde devido à chuva."
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "date": "2025-01-16",
    "status": "RASCUNHO",
    "createdAt": "2025-01-16T07:30:00Z"
  }
}
```

**Erros:**
- `409 DAILY_LOG_ALREADY_EXISTS` — já existe diário para essa data/obra
- `422 FUTURE_DATE` — data futura não permitida
- `422 WORKSITE_INACTIVE` — obra não está em andamento

---

### GET /api/daily-logs/:id

Retorna diário completo com todas as relações.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "date": "2025-01-15",
    "status": "APROVADO",
    "weather": {
      "morning": "ENSOLARADO",
      "afternoon": "NUBLADO",
      "tempMin": 18.0,
      "tempMax": 29.5
    },
    "workedHours": 8.5,
    "notes": "Dia produtivo.",
    "activities": [
      {
        "id": "uuid",
        "description": "Concretagem da laje do 3º pavimento",
        "location": "Bloco A",
        "quantity": 45.5,
        "unit": "m³",
        "progress": 100.00,
        "order": 1
      }
    ],
    "labor": [
      { "id": "uuid", "role": "Pedreiro", "quantity": 12, "shift": "INTEGRAL" },
      { "id": "uuid", "role": "Armador", "quantity": 8, "shift": "INTEGRAL" }
    ],
    "materials": [
      { "id": "uuid", "name": "Concreto usinado fck 25 MPa", "quantity": 45.5, "unit": "m³" }
    ],
    "occurrences": [
      {
        "id": "uuid",
        "type": "OBSERVACAO",
        "severity": "BAIXA",
        "description": "Caminhão betoneira com atraso de 30min",
        "actionTaken": "Reorganizado cronograma da tarde"
      }
    ],
    "photos": [
      {
        "id": "uuid",
        "url": "https://r2.example.com/photos/uuid.jpg",
        "thumbnailUrl": "https://r2.example.com/thumbs/uuid.jpg",
        "caption": "Concretagem em andamento",
        "takenAt": "2025-01-15T10:30:00Z"
      }
    ],
    "worksite": { "id": "uuid", "name": "Edifício Aurora" },
    "createdBy": { "id": "uuid", "name": "Carlos Lima" },
    "approvedBy": { "id": "uuid", "name": "Maria Souza" },
    "approvedAt": "2025-01-15T18:00:00Z"
  }
}
```

---

### PATCH /api/daily-logs/:id

Atualiza campos do diário (apenas RASCUNHO).

---

### POST /api/daily-logs/:id/activities

Adiciona atividade ao diário.

**Request:**
```json
{
  "description": "Instalação de tubulação de esgoto",
  "location": "Subsolo — área técnica",
  "quantity": 120.0,
  "unit": "m",
  "progress": 65.00
}
```

---

### POST /api/daily-logs/:id/labor

Adiciona registro de mão de obra.

**Request:**
```json
{
  "role": "Encanador",
  "quantity": 4,
  "shift": "MANHA",
  "contractor": "Hidro Serviços Ltda"
}
```

---

### POST /api/daily-logs/:id/materials

Adiciona material ao diário.

**Request:**
```json
{
  "name": "Tubo PVC DN 100mm",
  "quantity": 120.0,
  "unit": "m"
}
```

---

### POST /api/daily-logs/:id/occurrences

Registra ocorrência no diário.

**Request:**
```json
{
  "type": "PARALISACAO",
  "severity": "MEDIA",
  "description": "Falta de energia elétrica no bloco B por 2 horas",
  "actionTaken": "Acionada concessionária e uso de gerador temporário"
}
```

---

### POST /api/daily-logs/:id/submit

Submete o diário para aprovação.

**Requer:** GESTOR_OBRA ou superior  
**Request:** vazio  
**Response 200:**
```json
{ "data": { "status": "SUBMETIDO", "submittedAt": "2025-01-15T17:00:00Z" } }
```

**Erros:**
- `422 ALREADY_SUBMITTED` — já submetido
- `422 EMPTY_DIARY` — diário sem nenhuma atividade ou registro

---

### POST /api/daily-logs/:id/approve

Aprova o diário.

**Requer:** ADMIN_EMPRESA ou GESTOR_OBRA (aprovador)

**Response 200:**
```json
{ "data": { "status": "APROVADO", "approvedAt": "2025-01-15T18:00:00Z" } }
```

---

### POST /api/daily-logs/:id/reject

Rejeita o diário com motivo.

**Request:**
```json
{ "reason": "Faltam registros de mão de obra para o turno da tarde." }
```

---

### GET /api/daily-logs/:id/comments

Lista comentários de um diário.

---

### POST /api/daily-logs/:id/comments

Adiciona comentário.

**Request:**
```json
{ "content": "Favor complementar o registro de materiais utilizados." }
```

---

## 8. Módulo Reports

### POST /api/reports/daily-log/:id

Gera PDF de um diário individual.

**Requer:** APROVADO  
**Response:** `application/pdf` (stream) ou `{ "data": { "url": "https://..." } }` com URL temporária

---

### POST /api/reports/worksite/:id/period

Gera relatório consolidado de um período.

**Request:**
```json
{
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-31",
  "includePhotos": true,
  "includeOccurrences": true,
  "includeLabor": true,
  "includeMaterials": true
}
```

**Response 202:** (geração assíncrona no futuro; síncrona no MVP)
```json
{
  "data": {
    "reportUrl": "https://r2.example.com/reports/uuid.pdf",
    "expiresAt": "2025-01-16T10:30:00Z"
  }
}
```

**Erros:**
- `422 RANGE_TOO_LARGE` — período superior a 90 dias
- `422 NO_APPROVED_LOGS` — nenhum diário aprovado no período

---

## 9. Módulo Uploads

### POST /api/uploads/presigned

Gera URL pré-assinada para upload direto ao R2/S3.

**Request:**
```json
{
  "fileName": "foto-laje.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 3145728,
  "entityType": "DAILY_LOG",
  "entityId": "uuid"
}
```

**Response 200:**
```json
{
  "data": {
    "presignedUrl": "https://upload.r2.cloudflarestorage.com/bucket/...",
    "storageKey": "companies/uuid/daily-logs/uuid/foto-laje-abc123.jpg",
    "expiresAt": "2025-01-15T11:30:00Z"
  }
}
```

Após o upload, confirme o arquivo:

### POST /api/uploads/confirm

**Request:**
```json
{
  "storageKey": "companies/uuid/daily-logs/uuid/foto-laje-abc123.jpg",
  "entityType": "DAILY_LOG",
  "entityId": "uuid",
  "caption": "Vista da laje do 3º pavimento",
  "type": "PHOTO"
}
```

**Response 201:**
```json
{
  "data": {
    "attachmentId": "uuid",
    "photoId": "uuid",
    "url": "https://r2.example.com/...",
    "thumbnailUrl": "https://r2.example.com/thumbs/..."
  }
}
```

---

## 10. Códigos de Erro

### HTTP Status Codes

| Status | Significado |
|---|---|
| 200 | OK — operação bem-sucedida |
| 201 | Created — recurso criado |
| 202 | Accepted — processamento assíncrono |
| 400 | Bad Request — requisição malformada |
| 401 | Unauthorized — não autenticado |
| 403 | Forbidden — sem permissão |
| 404 | Not Found — recurso não encontrado |
| 409 | Conflict — conflito de estado |
| 422 | Unprocessable Entity — erro de validação/regra de negócio |
| 429 | Too Many Requests — rate limit |
| 500 | Internal Server Error — erro interno |
| 503 | Service Unavailable — manutenção |

### Códigos de Erro de Negócio

| Código | HTTP | Descrição |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | E-mail ou senha incorretos |
| `ACCOUNT_INACTIVE` | 401 | Conta desativada |
| `UNAUTHORIZED` | 401 | Não autenticado |
| `FORBIDDEN` | 403 | Sem permissão para esta ação |
| `TENANT_MISMATCH` | 403 | Tentativa de acesso cross-tenant |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `DAILY_LOG_ALREADY_EXISTS` | 409 | Diário duplicado para data/obra |
| `WORKSITE_LIMIT_REACHED` | 409 | Plano não permite mais obras |
| `USER_LIMIT_REACHED` | 409 | Plano não permite mais usuários |
| `VALIDATION_ERROR` | 422 | Dados de entrada inválidos (detalhes no campo `details`) |
| `FUTURE_DATE` | 422 | Data futura não permitida |
| `WORKSITE_INACTIVE` | 422 | Obra não está em andamento |
| `DIARY_NOT_SUBMITTED` | 422 | Diário não foi submetido antes de aprovar |
| `DIARY_ALREADY_APPROVED` | 422 | Diário já aprovado não pode ser editado |
| `EMPTY_DIARY` | 422 | Diário sem conteúdo não pode ser submetido |
| `INVALID_TOKEN` | 422 | Token inválido ou expirado |
| `WEAK_PASSWORD` | 422 | Senha não atende aos critérios mínimos |
| `FILE_TOO_LARGE` | 422 | Arquivo excede tamanho máximo |
| `UNSUPPORTED_FILE_TYPE` | 422 | Formato de arquivo não suportado |
| `RANGE_TOO_LARGE` | 422 | Intervalo de datas muito grande |
| `NO_APPROVED_LOGS` | 422 | Nenhum diário aprovado no período |
| `RATE_LIMIT_EXCEEDED` | 429 | Muitas requisições |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

### Exemplo de Resposta de Erro com Detalhes

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados de entrada inválidos",
    "details": [
      {
        "field": "date",
        "message": "Data futura não é permitida"
      },
      {
        "field": "tempMin",
        "message": "Temperatura mínima deve ser menor que a máxima"
      }
    ]
  }
}
```

### Exemplo de Erro de Rate Limit

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Muitas tentativas. Tente novamente em 5 minutos.",
    "retryAfter": 300
  }
}
```
