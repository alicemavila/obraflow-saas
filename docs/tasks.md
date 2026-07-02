# Plano de Tarefas — Diário de Obras SaaS

**Versão:** 1.0.0  
**Data:** 2025  
**Metodologia:** Desenvolvimento iterativo por fases  

---

## Legenda de Status

- `[ ]` — Pendente
- `[~]` — Em andamento
- `[x]` — Concluído
- `[!]` — Bloqueado

---

## Visão Geral das Fases

| Fase | Nome | Estimativa | Dependências |
|---|---|---|---|
| 1 | Setup, Banco, Autenticação e RBAC | 2 semanas | — |
| 2 | Área Administrativa | 2 semanas | Fase 1 |
| 3 | Diário de Obra | 3 semanas | Fase 2 |
| 4 | Fotos, Anexos e Comentários | 2 semanas | Fase 3 |
| 5 | Portal Cliente/Síndico | 1 semana | Fase 3 |
| 6 | Relatórios PDF | 2 semanas | Fase 4 |
| 7 | Segurança, LGPD e Auditoria | 2 semanas | Fase 6 |
| 8 | Testes, CI/CD e Deploy | 2 semanas | Fase 7 |
| **Total** | | **~16 semanas** | |

---

## FASE 1 — Setup, Banco, Autenticação e RBAC

**Objetivo:** Ter a base técnica do projeto funcionando com autenticação segura e isolamento de tenant.  
**Estimativa:** 2 semanas  

### 1.1 Setup do Projeto

- [ ] Criar projeto Next.js 14+ com TypeScript (`create-next-app --typescript`)
- [ ] Configurar ESLint + Prettier com regras do projeto
- [ ] Configurar Tailwind CSS e shadcn/ui
- [ ] Configurar paths absolutos no `tsconfig.json` (`@/` apontando para `src/`)
- [ ] Criar estrutura de pastas conforme `docs/architecture.md`
- [ ] Configurar `docker-compose.yml` para PostgreSQL e Redis local
- [ ] Criar `.env.example` com todas as variáveis documentadas
- [ ] Configurar Husky + lint-staged para pre-commit hooks
- [ ] Adicionar `.gitignore` adequado (`.env.local`, `node_modules`, `.next`, etc.)
- [ ] Criar `README.md` com instruções de setup local

### 1.2 Banco de Dados

- [ ] Instalar e configurar Prisma (`npm install prisma @prisma/client`)
- [ ] Criar `prisma/schema.prisma` com todos os modelos conforme `docs/data-model.md`
- [ ] Definir todos os enums: `CompanyPlan`, `CompanyStatus`, `UserRole`, `WorksiteStatus`, etc.
- [ ] Implementar modelo `Company` com campos completos
- [ ] Implementar modelo `User` com campos completos
- [ ] Implementar modelo `PasswordResetToken`
- [ ] Implementar modelo `InviteToken`
- [ ] Implementar modelo `Worksite`
- [ ] Implementar modelo `WorksiteUser`
- [ ] Implementar modelo `DailyLog`
- [ ] Implementar modelos `Activity`, `Labor`, `Material`, `Occurrence`
- [ ] Implementar modelos `Attachment`, `Photo`
- [ ] Implementar modelo `Comment`
- [ ] Implementar modelo `AuditLog`
- [ ] Criar índices recomendados no schema
- [ ] Gerar migration inicial: `npx prisma migrate dev --name init`
- [ ] Criar `prisma/seed.ts` com dados de desenvolvimento (empresa demo, SUPER_ADMIN, obras)
- [ ] Criar utilitário singleton do Prisma em `src/lib/db.ts`
- [ ] Testar conexão ao banco local com `prisma studio`

### 1.3 Autenticação

- [ ] Instalar Auth.js v5 (`npm install next-auth@beta`)
- [ ] Criar `src/lib/auth.ts` com configuração do NextAuth
- [ ] Implementar provider `Credentials` com bcrypt
- [ ] Configurar sessão JWT com campos customizados (`companyId`, `role`, `companySlug`)
- [ ] Criar augmentação de tipos em `src/types/next-auth.d.ts`
- [ ] Criar Route Handler `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Implementar `POST /api/auth/forgot-password`
  - [ ] Gerar token seguro (crypto.randomBytes)
  - [ ] Salvar hash do token com TTL de 1 hora
  - [ ] Enviar e-mail com link de recuperação
- [ ] Implementar `POST /api/auth/reset-password`
  - [ ] Validar token, verificar TTL
  - [ ] Atualizar senha com bcrypt
  - [ ] Invalidar token após uso
- [ ] Criar página de login (`src/app/(auth)/login/page.tsx`)
  - [ ] Formulário com React Hook Form + Zod
  - [ ] Feedback de erro ao usuário
  - [ ] Redirecionamento pós-login baseado no role
- [ ] Criar página de recuperação de senha
- [ ] Criar página de redefinição de senha
- [ ] Implementar utilitário de envio de e-mail em `src/lib/email.ts` (Resend)
- [ ] Criar templates de e-mail para: reset de senha, convite, boas-vindas

### 1.4 Middleware e RBAC

- [ ] Criar `src/middleware.ts` principal
  - [ ] Verificar sessão JWT para rotas protegidas
  - [ ] Redirecionar para login se não autenticado
  - [ ] Injetar `companyId` e `role` nos headers
  - [ ] Configurar matcher para rotas protegidas vs. públicas
- [ ] Criar `src/lib/permissions.ts` com funções de autorização
  - [ ] `canCreateWorksite(user)`
  - [ ] `canEditDailyLog(user, dailyLog)`
  - [ ] `canApproveDailyLog(user, worksite)`
  - [ ] `canViewDailyLog(user, dailyLog)`
  - [ ] `canManageUsers(user)`
  - [ ] `isWorksiteAssociated(userId, worksiteId)` — query no banco
- [ ] Criar helper `src/lib/auth-helpers.ts`
  - [ ] `getCurrentUser()` — retorna user da sessão
  - [ ] `requireAuth()` — lança 401 se não autenticado
  - [ ] `requireRole(role)` — lança 403 se sem permissão
  - [ ] `requireTenantAccess(resourceCompanyId)` — valida tenant
- [ ] Implementar proteção cross-tenant em todas as queries
- [ ] Criar testes unitários para funções de permissão

### 1.5 Rate Limiting

- [ ] Configurar cliente Redis em `src/lib/redis.ts`
- [ ] Implementar rate limiter para login (5 tentativas/min por IP)
- [ ] Implementar rate limiter geral para API (100 req/min por usuário)
- [ ] Retornar `Retry-After` header em respostas 429

### 1.6 Infraestrutura Inicial

- [ ] Configurar `next.config.ts` com headers de segurança
- [ ] Criar endpoint `GET /api/health` para health checks
- [ ] Configurar Sentry básico (captura de erros não tratados)
- [ ] Criar `Dockerfile` e `.dockerignore`
- [ ] Testar build de produção localmente

---

## FASE 2 — Área Administrativa

**Objetivo:** Gestão completa de empresa, usuários e obras pelo ADMIN_EMPRESA.  
**Estimativa:** 2 semanas  
**Dependências:** Fase 1 concluída  

### 2.1 Layout e Navegação

- [ ] Criar layout do dashboard (`src/app/(dashboard)/layout.tsx`)
  - [ ] Sidebar com navegação por role
  - [ ] Header com info do usuário, empresa e logout
  - [ ] Responsividade mobile (menu hamburger)
  - [ ] Loading skeleton para navegação
- [ ] Criar componentes base de UI
  - [ ] `PageHeader` com título e ações
  - [ ] `DataTable` genérico com paginação e ordenação
  - [ ] `StatusBadge` para status de obras e diários
  - [ ] `EmptyState` para listas vazias
  - [ ] `ConfirmDialog` para ações destrutivas
  - [ ] `LoadingSpinner` e `Skeleton`

### 2.2 Gestão da Empresa

- [ ] Implementar `GET /api/companies/:id` (ADMIN vê a própria)
- [ ] Implementar `PATCH /api/companies/:id` (nome, logo)
- [ ] Criar página de configurações da empresa (`/admin/empresa`)
  - [ ] Exibir dados: nome, CNPJ, plano, limites
  - [ ] Formulário de edição de nome e logo
  - [ ] Upload de logo (via presigned URL)
  - [ ] Indicador de uso: obras ativas / limite, usuários / limite
- [ ] Criar página de informações do plano (`/admin/plano`)
  - [ ] Exibir plano atual e funcionalidades
  - [ ] CTA para upgrade (link estático no MVP)

### 2.3 Gestão de Usuários

- [ ] Implementar `GET /api/users` com filtros e paginação
- [ ] Implementar `POST /api/users/invite`
  - [ ] Validar limite de usuários do plano
  - [ ] Gerar token de convite
  - [ ] Enviar e-mail de convite com link
- [ ] Implementar `GET /api/invites/:token` (aceitar convite — página pública)
- [ ] Implementar `POST /api/invites/:token/accept` (criar conta via convite)
- [ ] Implementar `PATCH /api/users/:id` (editar role, nome)
- [ ] Implementar `PATCH /api/users/:id/deactivate`
- [ ] Implementar `PATCH /api/users/:id/reactivate`
- [ ] Criar página de lista de usuários (`/admin/usuarios`)
  - [ ] Tabela com nome, e-mail, role, status, último login
  - [ ] Filtros: role, status
  - [ ] Botão "Convidar usuário"
  - [ ] Ações: editar role, desativar/reativar
- [ ] Criar modal/página de convite de usuário
  - [ ] Campos: e-mail, nome, role
  - [ ] Feedback de sucesso e exibição de link de convite
- [ ] Criar página de aceite de convite (`/accept-invite/:token`)
  - [ ] Validar token e exibir dados do convite
  - [ ] Formulário de criação de senha
  - [ ] Redirecionar para dashboard após aceite
- [ ] Criar página de perfil do usuário (`/admin/perfil`)
  - [ ] Editar nome, telefone, avatar
  - [ ] Trocar senha (campo senha atual + nova)

### 2.4 Gestão de Obras

- [ ] Implementar `GET /api/worksites` com filtros e paginação
- [ ] Implementar `POST /api/worksites`
  - [ ] Validar limite de obras do plano
  - [ ] Validar datas (início <= fim previsto)
- [ ] Implementar `GET /api/worksites/:id` com contagem de diários
- [ ] Implementar `PATCH /api/worksites/:id`
- [ ] Implementar `PATCH /api/worksites/:id/status`
- [ ] Implementar `GET /api/worksites/:id/users`
- [ ] Implementar `POST /api/worksites/:id/users`
- [ ] Implementar `DELETE /api/worksites/:id/users/:userId`
- [ ] Criar página de lista de obras (`/obras`)
  - [ ] Cards de obra com: nome, cidade, status, responsável, % período
  - [ ] Filtros: status, cidade, estado
  - [ ] Barra de busca por nome
  - [ ] Botão "Nova Obra" (só ADMIN)
- [ ] Criar formulário de criação/edição de obra (`/obras/nova`, `/obras/:id/editar`)
  - [ ] Campos completos: nome, endereço, CEP, ART, responsável, datas
  - [ ] Máscara de CEP com busca automática de endereço (ViaCEP API)
  - [ ] Validação com Zod
- [ ] Criar página de detalhe de obra (`/obras/:id`)
  - [ ] Dados da obra em painel
  - [ ] Tab de equipe: lista de usuários com roles
  - [ ] Tab de diários: listagem resumida
  - [ ] Botões de ação baseados em permissão
- [ ] Criar componente de gestão de equipe da obra
  - [ ] Adicionar usuário à obra (select de usuários da empresa)
  - [ ] Definir role na obra
  - [ ] Remover usuário da obra

### 2.5 Dashboard Home

- [ ] Criar página home do dashboard (`/`)
  - [ ] Resumo: total de obras, obras ativas, diários este mês
  - [ ] Lista de obras recentes com status
  - [ ] Diários pendentes de aprovação (para ADMIN/GESTOR)
  - [ ] Atividade recente (últimas ações da empresa)
- [ ] Implementar query otimizada para dados do dashboard

---

## FASE 3 — Diário de Obra

**Objetivo:** Implementar o núcleo do produto: criação, edição e aprovação do diário de obra.  
**Estimativa:** 3 semanas  
**Dependências:** Fase 2 concluída  

### 3.1 API do Diário

- [ ] Implementar `GET /api/worksites/:id/daily-logs` com paginação e filtros
- [ ] Implementar `POST /api/worksites/:id/daily-logs`
  - [ ] Validar unicidade de data por obra (retornar 409)
  - [ ] Validar data não futura
  - [ ] Validar obra em andamento
  - [ ] Criar registro e retornar 201
- [ ] Implementar `GET /api/daily-logs/:id` com relações completas
- [ ] Implementar `PATCH /api/daily-logs/:id` (somente RASCUNHO)
- [ ] Implementar `POST /api/daily-logs/:id/submit`
  - [ ] Validar status atual é RASCUNHO
  - [ ] Validar que tem pelo menos uma atividade registrada
  - [ ] Transição para SUBMETIDO
  - [ ] Notificar aprovadores por e-mail (assíncrono, MVP: síncrono)
- [ ] Implementar `POST /api/daily-logs/:id/approve`
  - [ ] Validar status atual é SUBMETIDO
  - [ ] Validar permissão do usuário para aprovar
  - [ ] Transição para APROVADO
- [ ] Implementar `POST /api/daily-logs/:id/reject`
  - [ ] Validar status atual é SUBMETIDO
  - [ ] Exigir motivo de rejeição
  - [ ] Transição para REJEITADO (volta a RASCUNHO para edição)
- [ ] Implementar CRUD de Activities (`/api/daily-logs/:id/activities`)
  - [ ] GET listagem, POST criar, PATCH/:actId editar, DELETE/:actId remover
  - [ ] Validar que diário está em RASCUNHO para CUD
- [ ] Implementar CRUD de Labor (`/api/daily-logs/:id/labor`)
- [ ] Implementar CRUD de Materials (`/api/daily-logs/:id/materials`)
- [ ] Implementar CRUD de Occurrences (`/api/daily-logs/:id/occurrences`)

### 3.2 Validações e Regras de Negócio

- [ ] Criar schemas Zod para todos os inputs (`src/lib/validations/daily-log.ts`)
- [ ] Middleware de bloqueio de edição para diários APROVADOS
- [ ] Validação de percentual de progresso (0 a 100)
- [ ] Validação de temperatura (tempMin <= tempMax)
- [ ] Validação de quantidade positiva para labor e materiais

### 3.3 Interface — Lista de Diários

- [ ] Criar página de diários de uma obra (`/obras/:id/diarios`)
  - [ ] Listagem em cards ou tabela com: data, status, condição climática, totais
  - [ ] Filtros: status, período de data
  - [ ] Botão "Novo Diário" (se obra ativa e usuário tem permissão)
  - [ ] Badge de status colorido por tipo
  - [ ] Indicador de "pendente de aprovação" para ADMIN/GESTOR

### 3.4 Interface — Formulário do Diário

- [ ] Criar página de criação de diário (`/obras/:id/diarios/novo`)
  - [ ] Seletor de data com validação (não futuro, não duplicado)
  - [ ] Seleção de condições climáticas (manhã, tarde, noite)
  - [ ] Campos de temperatura min/max
  - [ ] Campo de horas trabalhadas
  - [ ] Campo de observações gerais
  - [ ] Botões: "Salvar rascunho" e "Submeter para aprovação"

### 3.5 Interface — Seção de Atividades

- [ ] Criar componente `ActivitySection` dentro do diário
  - [ ] Lista de atividades com ordem editável (drag-and-drop futuro; manual no MVP)
  - [ ] Botão "+ Adicionar Atividade"
  - [ ] Inline form para nova atividade
  - [ ] Edição inline de atividade existente
  - [ ] Excluir atividade com confirmação
  - [ ] Campos: descrição, local, quantidade, unidade, progresso (%)
  - [ ] Bloquear CUD se diário não estiver em RASCUNHO

### 3.6 Interface — Seção de Mão de Obra

- [ ] Criar componente `LaborSection` dentro do diário
  - [ ] Tabela de registros: função, quantidade, turno, contratada
  - [ ] Formulário de adição com select de turno
  - [ ] Total de trabalhadores por turno (rodapé da tabela)
  - [ ] Edição e exclusão de registros

### 3.7 Interface — Seção de Materiais

- [ ] Criar componente `MaterialSection` dentro do diário
  - [ ] Lista: material, quantidade, unidade
  - [ ] Formulário de adição com autocomplete de unidades comuns
  - [ ] Edição e exclusão

### 3.8 Interface — Seção de Ocorrências

- [ ] Criar componente `OccurrenceSection` dentro do diário
  - [ ] Lista com: tipo, severidade, descrição, ação tomada
  - [ ] Badge de severidade colorido (CRITICA=vermelho, ALTA=laranja, etc.)
  - [ ] Formulário de adição com select de tipo e severidade
  - [ ] Campo de ação tomada
  - [ ] Toggle de "resolvida"

### 3.9 Interface — Detalhe e Aprovação do Diário

- [ ] Criar página de detalhe do diário (`/diarios/:id`)
  - [ ] Todas as seções em modo de leitura quando APROVADO
  - [ ] Breadcrumb: Empresa > Obra > Diários > Data
  - [ ] Barra de status com histórico de transições
  - [ ] Botão "Aprovar" para ADMIN/GESTOR autorizados
  - [ ] Botão "Rejeitar" com modal de motivo
  - [ ] Botão "Gerar PDF" para diários APROVADOS
  - [ ] Timeline de aprovação no rodapé

### 3.10 Estados e Transições Visuais

- [ ] Implementar componente `DailyLogStatus` com estados visuais
- [ ] Animação de transição ao mudar status
- [ ] Notificação toast ao salvar, submeter, aprovar ou rejeitar
- [ ] Loading state durante operações assíncronas

---

## FASE 4 — Fotos, Anexos e Comentários

**Objetivo:** Gestão de mídia e colaboração via comentários.  
**Estimativa:** 2 semanas  
**Dependências:** Fase 3 concluída  

### 4.1 Storage — Configuração

- [ ] Criar cliente S3/R2 em `src/lib/s3.ts`
  - [ ] Configurar endpoint, credenciais, bucket
  - [ ] Função `generatePresignedUploadUrl(key, mimeType, expiresIn)`
  - [ ] Função `generatePresignedDownloadUrl(key, expiresIn)`
  - [ ] Função `deleteObject(key)`
- [ ] Definir estrutura de chaves no bucket:
  ```
  companies/{companyId}/worksites/{worksiteId}/daily-logs/{logId}/photos/{uuid}.jpg
  companies/{companyId}/worksites/{worksiteId}/daily-logs/{logId}/attachments/{uuid}.pdf
  companies/{companyId}/logos/{uuid}.png
  companies/{companyId}/reports/{uuid}.pdf
  temp/uploads/{uuid}  (TTL 1h)
  ```

### 4.2 API de Uploads

- [ ] Implementar `POST /api/uploads/presigned`
  - [ ] Validar permissão do usuário para o entityId
  - [ ] Validar mimeType contra lista de permitidos
  - [ ] Validar fileSize contra limite por tipo
  - [ ] Gerar storageKey com UUID para evitar colisões
  - [ ] Gerar presigned URL com TTL de 15 minutos
  - [ ] Retornar `{ presignedUrl, storageKey, expiresAt }`
- [ ] Implementar `POST /api/uploads/confirm`
  - [ ] Validar que o arquivo existe no bucket (verificar metadata)
  - [ ] Criar registro `Attachment` no banco
  - [ ] Se tipo é imagem, extrair EXIF (sharp) e criar registro `Photo`
  - [ ] Gerar thumbnail (sharp — 400x400 max)
  - [ ] Retornar URL de acesso
- [ ] Implementar `GET /api/daily-logs/:id/photos` com URLs pré-assinadas
- [ ] Implementar `GET /api/daily-logs/:id/attachments`
- [ ] Implementar `DELETE /api/attachments/:id`
  - [ ] Soft delete no banco
  - [ ] Verificar se diário não está APROVADO
  - [ ] (Opcional) remover do bucket após confirmação

### 4.3 Interface — Upload de Fotos

- [ ] Criar componente `PhotoUpload` para o diário
  - [ ] Drag-and-drop ou seleção de arquivo
  - [ ] Preview em tempo real antes do upload
  - [ ] Barra de progresso do upload (XMLHttpRequest direto ao R2)
  - [ ] Suporte a múltiplos arquivos (max 10 por vez)
  - [ ] Validação de tipo (JPEG, PNG, WebP, HEIC) e tamanho (< 20 MB)
  - [ ] Compressão client-side (browser-image-compression) antes do upload
- [ ] Criar componente `PhotoGallery` para visualização
  - [ ] Grid de thumbnails
  - [ ] Lightbox para visualização em tela cheia
  - [ ] Caption editável (se diário em RASCUNHO)
  - [ ] Botão de exclusão com confirmação
  - [ ] Exibir data/hora da foto (EXIF ou server timestamp)
  - [ ] Exibir uploader e data de upload

### 4.4 Interface — Upload de Documentos

- [ ] Criar componente `AttachmentUpload`
  - [ ] Seleção de arquivo (PDF, DWG, DXF, XLSX)
  - [ ] Validação de tipo e tamanho (< 50 MB para PDF)
  - [ ] Progresso de upload
- [ ] Criar componente `AttachmentList`
  - [ ] Lista com ícone por tipo, nome, tamanho, uploader
  - [ ] Botão de download (gera URL pré-assinada)
  - [ ] Botão de exclusão (se permitido)

### 4.5 Processamento de Imagens (Server-side)

- [ ] Criar job de processamento de imagem após confirmação de upload
  - [ ] Extrair metadados EXIF com `exifr` ou `sharp`
  - [ ] Salvar lat/lng, takenAt no registro `Photo`
  - [ ] Remover dados GPS do EXIF antes de servir publicamente (LGPD)
  - [ ] Gerar thumbnail 400x400 com `sharp`
  - [ ] Gerar versão WebP otimizada para web
  - [ ] Atualizar `thumbnailStorageKey` no banco

### 4.6 API de Comentários

- [ ] Implementar `GET /api/daily-logs/:id/comments`
- [ ] Implementar `POST /api/daily-logs/:id/comments`
  - [ ] Validar que usuário tem acesso ao diário
  - [ ] CLIENTE_SINDICO pode comentar apenas em diários APROVADOS
- [ ] Implementar `PATCH /api/comments/:id` (edição dentro de 15min)
- [ ] Implementar `DELETE /api/comments/:id` (soft delete)

### 4.7 Interface — Comentários

- [ ] Criar componente `CommentSection`
  - [ ] Lista de comentários com avatar, nome, data relativa
  - [ ] Campo de input com envio por Enter ou botão
  - [ ] Indicador de "editado" para comentários modificados
  - [ ] Botão de exclusão (apenas o próprio autor ou ADMIN)
  - [ ] Estado de carregamento e erro
  - [ ] Auto-scroll para comentário mais recente

---

## FASE 5 — Portal Cliente/Síndico

**Objetivo:** Área restrita para clientes acompanharem o andamento das obras.  
**Estimativa:** 1 semana  
**Dependências:** Fase 3 concluída  

### 5.1 Configuração do Portal

- [ ] Criar route group `(client)` separado do dashboard principal
- [ ] Criar layout específico para o portal do cliente (`/client/layout.tsx`)
  - [ ] Header simplificado com logo da empresa e nome da obra
  - [ ] Navegação minimal: Obras, Relatórios
  - [ ] Sem acesso às áreas administrativas
- [ ] Configurar middleware para CLIENTE_SINDICO
  - [ ] Verificar que usuário é CLIENTE_SINDICO
  - [ ] Redirecionar para portal, não para dashboard principal
  - [ ] Bloquear acesso a rotas `/admin`, `/obras/nova`, etc.

### 5.2 API para Portal do Cliente

- [ ] Criar endpoint `GET /api/client/worksites`
  - [ ] Retornar apenas obras às quais o CLIENTE_SINDICO está associado
  - [ ] Apenas obras ativas ou concluídas
- [ ] Criar endpoint `GET /api/client/worksites/:id`
  - [ ] Retornar detalhes da obra + progresso geral
- [ ] Criar endpoint `GET /api/client/worksites/:id/daily-logs`
  - [ ] Retornar apenas diários com status APROVADO
  - [ ] Paginação e filtro de período
- [ ] Criar endpoint `GET /api/client/daily-logs/:id`
  - [ ] Retornar diário completo (somente APROVADO)
  - [ ] Incluir fotos com URLs pré-assinadas
  - [ ] Excluir campos internos (IPs, hashes)

### 5.3 Interface — Portal do Cliente

- [ ] Criar página inicial do portal (`/client`)
  - [ ] Lista das obras associadas ao cliente
  - [ ] Card de obra: nome, endereço, status, última atualização, % do período
- [ ] Criar página de detalhe da obra no portal (`/client/obras/:id`)
  - [ ] Dados gerais da obra
  - [ ] Timeline de diários aprovados do mês atual
  - [ ] Filtro de período para histórico
  - [ ] Contadores: dias trabalhados, ocorrências, fotos
- [ ] Criar página de visualização do diário no portal
  - [ ] Layout de leitura limpo, sem controles de edição
  - [ ] Todas as seções: clima, atividades, mão de obra, materiais, ocorrências
  - [ ] Galeria de fotos aprovadas
  - [ ] Botão "Baixar PDF" destacado
  - [ ] Seção de comentários (pode comentar, não pode aprovar)
- [ ] Criar página de relatórios do portal (`/client/relatorios`)
  - [ ] Seleção de obra (das obras associadas)
  - [ ] Seleção de período
  - [ ] Botão "Gerar Relatório PDF"

---

## FASE 6 — Relatórios PDF

**Objetivo:** Geração automatizada de relatórios profissionais em PDF.  
**Estimativa:** 2 semanas  
**Dependências:** Fase 4 concluída  

### 6.1 Configuração do Gerador de PDF

- [ ] Avaliar e escolher biblioteca: `@react-pdf/renderer` (recomendado para MVP)
- [ ] Instalar dependências: `npm install @react-pdf/renderer`
- [ ] Criar utilitário `src/lib/pdf.ts` com funções de geração
- [ ] Criar fonte customizada para PDF (Roboto ou similar via PDF renderer)
- [ ] Configurar carregamento do logo da empresa em base64 para PDF

### 6.2 Templates de PDF

- [ ] Criar componente `DailyLogPDF` (relatório de diário individual)
  - [ ] Cabeçalho: logo empresa, nome da obra, data
  - [ ] Dados da obra: endereço, responsável técnico, ART
  - [ ] Seção de condições climáticas com ícone
  - [ ] Seção de atividades em tabela
  - [ ] Seção de mão de obra em tabela (com totais)
  - [ ] Seção de materiais em tabela
  - [ ] Seção de ocorrências com severidade colorida
  - [ ] Galeria de fotos selecionadas (grid 2x3 por página)
  - [ ] Assinatura digital: aprovado por, data e hora
  - [ ] Rodapé: número de página, data de geração, "Documento gerado por Diário de Obras SaaS"
- [ ] Criar componente `PeriodReportPDF` (relatório consolidado)
  - [ ] Capa: empresa, obra, período
  - [ ] Sumário executivo: totais do período (dias trabalhados, mão de obra total, ocorrências)
  - [ ] Tabela de resumo dos diários aprovados
  - [ ] Seção de ocorrências críticas e altas do período
  - [ ] Gráficos simples (barras de texto/ASCII no MVP; biblioteca de gráficos pós-MVP)
  - [ ] Fotos selecionadas por diário

### 6.3 API de Geração de PDF

- [ ] Implementar `POST /api/reports/daily-log/:id`
  - [ ] Verificar permissão e status APROVADO
  - [ ] Buscar todos os dados necessários (atividades, fotos, etc.)
  - [ ] Gerar PDF com React-PDF
  - [ ] Salvar PDF gerado no R2 com TTL de 24h
  - [ ] Retornar URL pré-assinada para download
- [ ] Implementar `POST /api/reports/worksite/:id/period`
  - [ ] Validar período (máximo 90 dias)
  - [ ] Verificar que há diários aprovados no período
  - [ ] Buscar todos os diários e dados relacionados
  - [ ] Gerar PDF consolidado
  - [ ] Salvar e retornar URL
- [ ] Implementar cache de PDF gerado (re-usar se dados não mudaram)

### 6.4 Interface de Relatórios

- [ ] Criar página de relatórios (`/relatorios`)
  - [ ] Seleção de obra
  - [ ] Seleção de tipo: individual ou período
  - [ ] Para individual: listagem de diários aprovados para seleção
  - [ ] Para período: seletor de data início/fim
  - [ ] Opções de conteúdo: incluir fotos, incluir ocorrências, incluir detalhamento
  - [ ] Botão "Gerar PDF" com loading state
  - [ ] Preview do relatório (se possível com react-pdf viewer)
  - [ ] Link de download após geração
- [ ] Integrar botão "Gerar PDF" no detalhe do diário
- [ ] Integrar geração de PDF no portal do cliente

---

## FASE 7 — Segurança, LGPD e Auditoria

**Objetivo:** Implementar camadas de segurança e conformidade LGPD completas.  
**Estimativa:** 2 semanas  
**Dependências:** Fase 6 concluída  

### 7.1 Auditoria Completa

- [ ] Criar `src/lib/audit.ts` com função `logAuditEvent`
  ```typescript
  logAuditEvent({
    companyId, userId, action, entityType, entityId, payload, req
  })
  ```
- [ ] Integrar auditoria em todas as operações críticas:
  - [ ] `user.created`, `user.invited`, `user.deactivated`
  - [ ] `user.login`, `user.login_failed`, `user.logout`
  - [ ] `user.password_reset`
  - [ ] `worksite.created`, `worksite.updated`, `worksite.status_changed`
  - [ ] `daily_log.created`, `daily_log.submitted`, `daily_log.approved`, `daily_log.rejected`
  - [ ] `attachment.uploaded`, `attachment.deleted`
  - [ ] `company.updated`
  - [ ] `role.changed`
- [ ] Implementar `GET /api/audit-logs` para ADMIN_EMPRESA
  - [ ] Filtros: ação, usuário, período, entidade
  - [ ] Paginação
  - [ ] Exportação em CSV
- [ ] Criar página de auditoria no painel admin (`/admin/auditoria`)
  - [ ] Tabela com timestamp, usuário, ação, entidade
  - [ ] Filtros por período, usuário, tipo de ação
  - [ ] Expandir linha para ver payload completo

### 7.2 Proteções de Segurança

- [ ] Revisar e garantir tenant guard em 100% das queries de banco
- [ ] Adicionar testes automatizados de cross-tenant (ver Fase 8)
- [ ] Implementar detecção de tentativas de acesso cross-tenant
  - [ ] Log de nível ERROR no AuditLog
  - [ ] Alerta por e-mail para SUPER_ADMIN (pós-MVP: webhook)
- [ ] Implementar bloqueio de conta após N tentativas de login
  - [ ] Armazenar contagem de falhas no Redis com TTL
  - [ ] Desbloquear automaticamente após o período
  - [ ] Notificar usuário por e-mail sobre bloqueio
- [ ] Implementar validação MIME type server-side em uploads
  - [ ] Verificar magic bytes, não apenas extensão
  - [ ] Bloquear tipos não permitidos antes de gerar presigned URL
- [ ] Revisar headers de segurança HTTP em produção
- [ ] Implementar CSP (Content Security Policy) sem `unsafe-inline` em produção
- [ ] Configurar `npm audit` no CI/CD (bloqueante para HIGH/CRITICAL)

### 7.3 LGPD — Implementação

- [ ] Criar página de política de privacidade acessível publicamente
- [ ] Adicionar checkbox de aceite dos termos no cadastro/convite
- [ ] Implementar endpoint `GET /api/users/:id/export-data`
  - [ ] Exportar todos os dados pessoais do usuário em JSON
  - [ ] Incluir: perfil, atividade de login, diários criados, comentários
- [ ] Implementar endpoint `POST /api/users/:id/request-deletion`
  - [ ] Registrar solicitação de exclusão
  - [ ] Notificar DPO por e-mail
  - [ ] Criar ticket no AuditLog
- [ ] Implementar anonimização de usuário (painel SUPER_ADMIN)
  - [ ] Substituir nome por "[Usuário Removido]"
  - [ ] Substituir e-mail por hash anonimizado
  - [ ] Preservar registros de diário, atividades e auditoria
- [ ] Criar painel de solicitações LGPD para SUPER_ADMIN
  - [ ] Lista de solicitações pendentes
  - [ ] Ações: exportar dados, anonimizar, confirmar atendimento
- [ ] Implementar gestão de consentimento de comunicações
  - [ ] Campo `marketingConsent` no User
  - [ ] Toggle na área de perfil
  - [ ] Respeitar consentimento no envio de e-mails

### 7.4 Segurança de Dados

- [ ] Implementar stripping de EXIF GPS em fotos antes de servir publicamente
- [ ] Garantir que logs de erro no Sentry não contenham dados pessoais
  - [ ] Configurar `beforeSend` para sanitizar eventos
- [ ] Revisar queries de banco para garantir sem SQL raw desnecessário
- [ ] Implementar mascaramento de dados sensíveis em logs de aplicação

---

## FASE 8 — Testes, CI/CD e Deploy

**Objetivo:** Qualidade de código garantida por testes e pipeline de CI/CD funcional.  
**Estimativa:** 2 semanas  
**Dependências:** Fase 7 concluída  

### 8.1 Testes Unitários

- [ ] Configurar Jest + Testing Library (`npm install --save-dev jest @testing-library/react`)
- [ ] Configurar banco de teste isolado (SQLite em memória ou PostgreSQL de teste)
- [ ] Testes para `src/lib/permissions.ts`
  - [ ] Todas as funções `can*` com cada combinação de role
  - [ ] Casos de borda: usuário inativo, papel errado
- [ ] Testes para schemas Zod (`src/lib/validations/`)
  - [ ] Inputs válidos passam
  - [ ] Inputs inválidos retornam erros esperados
- [ ] Testes para helpers de auth
  - [ ] `requireAuth` lança 401 sem sessão
  - [ ] `requireRole` lança 403 com role insuficiente
  - [ ] `requireTenantAccess` lança 403 para companyId diferente

### 8.2 Testes de Integração (API)

- [ ] Configurar `@testing-library/jest-dom` + banco de teste
- [ ] Testes de autenticação
  - [ ] Login bem-sucedido retorna sessão
  - [ ] Login com senha errada retorna 401
  - [ ] Rate limit bloqueia após 5 tentativas
  - [ ] Reset de senha com token válido funciona
  - [ ] Reset de senha com token expirado retorna 422
- [ ] Testes de multitenancy (críticos)
  - [ ] Usuário do tenant A não acessa dados do tenant B (400+ endpoints)
  - [ ] SUPER_ADMIN acessa dados de qualquer tenant
- [ ] Testes de RBAC
  - [ ] COLABORADOR não pode aprovar diário (retorna 403)
  - [ ] CLIENTE_SINDICO não cria diário (retorna 403)
  - [ ] GESTOR_OBRA não cria obra (retorna 403)
- [ ] Testes para regras de negócio do Diário
  - [ ] Diário duplicado retorna 409
  - [ ] Data futura retorna 422
  - [ ] Editar diário APROVADO retorna 403
  - [ ] Aprovar diário RASCUNHO retorna 422
- [ ] Testes de upload
  - [ ] Geração de presigned URL com permissão válida
  - [ ] Rejeição de MIME type inválido

### 8.3 Testes End-to-End (E2E)

- [ ] Configurar Playwright (`npm install --save-dev @playwright/test`)
- [ ] Fluxo de cadastro e login
- [ ] Fluxo completo de criação e aprovação de diário
- [ ] Fluxo de upload de foto
- [ ] Fluxo de geração de PDF
- [ ] Fluxo do portal do cliente

### 8.4 CI/CD Pipeline

- [ ] Criar workflow GitHub Actions para CI (`.github/workflows/ci.yml`)
  - [ ] Trigger: push em qualquer branch + PR para main
  - [ ] Jobs: lint, type-check, test (unit + integration)
  - [ ] Usar PostgreSQL service container para testes de integração
  - [ ] Cachear `node_modules` e `.next` para performance
  - [ ] Bloquear merge em PR se CI falhar
- [ ] Criar workflow de deploy para staging (`.github/workflows/deploy-staging.yml`)
  - [ ] Trigger: push na branch `develop`
  - [ ] Rodar migrations automáticas
  - [ ] Deploy no ambiente de staging
- [ ] Criar workflow de deploy para produção (`.github/workflows/deploy-prod.yml`)
  - [ ] Trigger: push na branch `main` (via PR aprovado)
  - [ ] Requer aprovação manual de um reviewer
  - [ ] Rodar migrations
  - [ ] Deploy em produção
  - [ ] Smoke test pós-deploy (chamar `/api/health`)
  - [ ] Rollback automático se smoke test falhar

### 8.5 Qualidade de Código

- [ ] Configurar ESLint com regras de segurança (`eslint-plugin-security`)
- [ ] Configurar `@typescript-eslint/no-unsafe-*` rules
- [ ] Adicionar verificação de tipos no CI (`tsc --noEmit`)
- [ ] Configurar cobertura de testes mínima: 70% para lib/, 60% geral
- [ ] Configurar Dependabot para atualizações automáticas de segurança

### 8.6 Deploy em Produção

- [ ] Provisionar banco PostgreSQL gerenciado (Railway/Render/AWS RDS)
- [ ] Provisionar Redis gerenciado
- [ ] Configurar bucket R2/S3 com CORS e lifecycle
- [ ] Configurar variáveis de ambiente em produção
- [ ] Rodar `prisma migrate deploy` em produção
- [ ] Rodar seed de dados iniciais (SUPER_ADMIN)
- [ ] Configurar domínio e HTTPS
- [ ] Configurar monitoramento de uptime
- [ ] Realizar smoke test manual completo
- [ ] Executar checklist de produção (ver `docs/deployment.md#checklist`)
- [ ] Configurar alertas e runbook de incidentes

### 8.7 Documentação Final

- [ ] Atualizar `README.md` com: setup local, comandos, links úteis
- [ ] Criar `CONTRIBUTING.md` com guia de contribuição
- [ ] Criar `CHANGELOG.md` para rastrear versões
- [ ] Revisar e validar todos os documentos em `docs/`
- [ ] Criar documentação de onboarding para novos desenvolvedores

---

## Tarefas Técnicas Transversais

Estas tarefas se aplicam ao longo de todas as fases:

- [ ] Toda nova API Route deve ter validação Zod de input
- [ ] Toda query de banco deve incluir `companyId` no WHERE
- [ ] Todo erro de negócio deve ter código estruturado (não apenas mensagem)
- [ ] Todo upload deve ser validado por tipo e tamanho antes de gerar presigned URL
- [ ] Todo novo endpoint deve ser coberto por teste de integração
- [ ] Toda ação crítica deve ser registrada no `AuditLog`
- [ ] Mensagens de erro para o usuário devem ser em português claro
- [ ] Loading states devem ser implementados para todas as operações assíncronas
- [ ] Componentes devem ter tratamento de estado de erro (`error.tsx`)
- [ ] Acessibilidade: labels em todos os formulários, alt text em imagens, contraste WCAG AA

---

## Estimativa de Esforço por Fase

| Fase | Dev 1 | Dev 2 | Total |
|---|---|---|---|
| 1 — Setup + Auth + RBAC | 5 dias | 5 dias | 10 dias |
| 2 — Área Admin | 5 dias | 5 dias | 10 dias |
| 3 — Diário de Obra | 8 dias | 7 dias | 15 dias |
| 4 — Fotos + Comentários | 5 dias | 5 dias | 10 dias |
| 5 — Portal Cliente | 3 dias | 2 dias | 5 dias |
| 6 — Relatórios PDF | 5 dias | 5 dias | 10 dias |
| 7 — Segurança + LGPD | 5 dias | 5 dias | 10 dias |
| 8 — Testes + CI/CD + Deploy | 5 dias | 5 dias | 10 dias |
| **Total** | **41 dias** | **39 dias** | **~80 dias** |

> Estimativa baseada em 2 desenvolvedores trabalhando full-time (~8 semanas corridas com sobreposição de tarefas).
