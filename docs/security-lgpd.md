# Segurança e LGPD — Diário de Obras SaaS

**Versão:** 1.0.0  
**Data:** 2025  
**Responsável:** DPO / CTO  

---

## Sumário

1. [Dados Coletados e Finalidade](#1-dados-coletados-e-finalidade)
2. [Controle de Acesso aos Dados](#2-controle-de-acesso-aos-dados)
3. [Proteção dos Dados](#3-proteção-dos-dados)
4. [Política de Retenção](#4-política-de-retenção)
5. [Direitos do Titular (LGPD Art. 18)](#5-direitos-do-titular-lgpd-art-18)
6. [Privacy by Design e Privacy by Default](#6-privacy-by-design-e-privacy-by-default)
7. [Boas Práticas para Produção](#7-boas-práticas-para-produção)
8. [OWASP ASVS — Mapeamento](#8-owasp-asvs--mapeamento)
9. [Plano de Resposta a Incidentes](#9-plano-de-resposta-a-incidentes)
10. [Mapeamento Completo de Dados Pessoais](#10-mapeamento-completo-de-dados-pessoais)

---

## 1. Dados Coletados e Finalidade

### 1.1 Dados de Usuários da Plataforma

| Dado | Por que é coletado | Base Legal (LGPD) |
|---|---|---|
| Nome completo | Identificação e exibição no sistema | Art. 7º, II (contrato) |
| Endereço de e-mail | Autenticação, comunicações, recuperação de senha | Art. 7º, II (contrato) |
| Senha (hash bcrypt) | Autenticação segura | Art. 7º, II (contrato) |
| Telefone | Contato de suporte (opcional) | Art. 7º, I (consentimento) |
| Foto de perfil (avatar) | Personalização da interface (opcional) | Art. 7º, I (consentimento) |
| Cargo / função | Controle de acesso (RBAC) | Art. 7º, II (contrato) |
| Data e hora do último login | Segurança / detecção de anomalias | Art. 7º, V (legítimo interesse) |

### 1.2 Dados de Colaboradores de Obras

| Dado | Por que é coletado | Base Legal |
|---|---|---|
| Função/cargo | Registro de mão de obra (RDO) | Art. 7º, II (contrato) |
| Quantidade por turno | Registro de produtividade | Art. 7º, II (contrato) |
| Nome da empresa contratada | Rastreabilidade contratual | Art. 7º, II (contrato) |

> **Nota:** O sistema **não coleta** CPF, RG, dados biométricos ou informações de saúde de colaboradores no MVP. Apenas função, quantidade e empresa são registrados.

### 1.3 Dados de Uso e Infraestrutura

| Dado | Por que é coletado | Base Legal |
|---|---|---|
| Endereço IP | Segurança, auditoria, rate limiting | Art. 7º, V (legítimo interesse) |
| User agent | Detecção de anomalias, suporte | Art. 7º, V (legítimo interesse) |
| Timestamp de ações | Trilha de auditoria | Art. 7º, V (legítimo interesse) |
| Geolocalização de fotos | Evidência documental de obra (EXIF) | Art. 7º, II (contrato) |

### 1.4 Dados NÃO Coletados

O sistema **não coleta** e **não deve coletar** sem revisão desta política:

- Dados biométricos (impressão digital, reconhecimento facial)
- CPF / RG de colaboradores externos
- Dados de saúde
- Informações financeiras pessoais
- Dados de crianças e adolescentes
- Informações de localização em tempo real (tracking)

---

## 2. Controle de Acesso aos Dados

### 2.1 Por Perfil de Usuário

| Categoria de Dado | SUPER_ADMIN | ADMIN_EMPRESA | GESTOR_OBRA | COLABORADOR | CLIENTE_SINDICO |
|---|---|---|---|---|---|
| Dados de usuários da empresa | ✅ Todos | ✅ Própria empresa | ❌ | ❌ | ❌ |
| Dados de outras empresas | ✅ | ❌ | ❌ | ❌ | ❌ |
| IPs e logs de auditoria | ✅ | ✅ Própria empresa | ❌ | ❌ | ❌ |
| Fotos de obras | ✅ | ✅ | ✅ Obras assoc. | ✅ Obras assoc. | ✅ Aprovadas |
| Diários de obra | ✅ | ✅ | ✅ Obras assoc. | ✅ Obras assoc. | ✅ Aprovados |

### 2.2 Acesso por Equipe Interna (Operadora)

| Papel | Acesso permitido |
|---|---|
| Desenvolvedor | Banco de desenvolvimento apenas; produção via scripts auditados |
| Suporte N1 | Painel admin limitado; sem acesso a dados de conteúdo |
| DBA | Acesso ao banco de produção com autenticação MFA, apenas para manutenção |
| Nenhum funcionário | Não deve acessar fotos ou diários de clientes sem solicitação formal |

---

## 3. Proteção dos Dados

### 3.1 Em Trânsito

- **TLS 1.2+ obrigatório** para toda comunicação cliente-servidor
- **HSTS** configurado: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- Certificados gerenciados automaticamente (Let's Encrypt via Railway/Render ou AWS ACM)
- Comunicação com banco de dados e R2 via conexões TLS

### 3.2 Em Repouso

- **PostgreSQL:** encryption at rest habilitado no provedor gerenciado (AES-256)
- **R2/S3:** Server-Side Encryption habilitado por padrão (SSE-S3 ou SSE-KMS)
- **Senhas:** bcrypt com cost factor 12 (nunca armazenadas em texto plano)
- **Tokens de convite:** HMAC-SHA256 com expiração de 72 horas

### 3.3 Controles de Aplicação

```
┌─────────────────────────────────────────────────────────┐
│  Camadas de Defesa                                       │
│                                                          │
│  1. Rate Limiting      → Brute-force, scraping           │
│  2. Autenticação JWT   → Identidade verificada           │
│  3. Autorização RBAC   → Permissão verificada            │
│  4. Tenant Guard       → Isolamento de dados             │
│  5. Validação Zod      → Injeção prevenida               │
│  6. Prepared Statements→ SQL injection (via Prisma)      │
│  7. CSRF Protection    → SameSite=Strict                 │
│  8. CSP Headers        → XSS mitigado                    │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Headers de Segurança HTTP

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe* apenas em dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.r2.dev https://*.amazonaws.com",
      "connect-src 'self'",
    ].join('; '),
  },
];
```

---

## 4. Política de Retenção

### 4.1 Tabela de Retenção

| Categoria | Dado | Retenção | Ação ao Vencer |
|---|---|---|---|
| Dados de conta ativa | Nome, e-mail, perfil | Enquanto a conta existir | — |
| Dados de conta encerrada | Nome, e-mail | 5 anos após encerramento | Anonimização |
| Diários de obra | Todos os campos | 5 anos após conclusão da obra | Arquivamento |
| Fotos | Imagens da obra | 5 anos após conclusão | Exclusão do storage |
| Logs de auditoria | Ações do sistema | 5 anos | Exclusão |
| Logs de acesso (IP) | IP, user agent, timestamp | 12 meses | Exclusão automática |
| Tokens de convite | Hash + expiração | 72 horas | Expiração automática |
| Tokens de reset de senha | Hash + expiração | 1 hora | Expiração automática |
| Backups de banco | Snapshot completo | 30 dias (diário) + 12 meses (semanal) | Exclusão automática |

### 4.2 Justificativa do Prazo de 5 Anos

O prazo de 5 anos para dados de obra é baseado em:
- **Código Civil Brasileiro, Art. 206, §5º, I:** prescrição de ações relacionadas a obras em 5 anos
- **Norma ABNT NBR 14037:** documentação de obras deve ser mantida pelo responsável técnico
- **Prática do mercado:** laudos e RDOs são solicitados em disputas contratuais por até 5 anos

---

## 5. Direitos do Titular (LGPD Art. 18)

### 5.1 Como o Titular Pode Exercer seus Direitos

O sistema deve fornecer ao usuário autenticado, em sua área de perfil, os seguintes controles:

| Direito | Como é atendido | Prazo de atendimento |
|---|---|---|
| **Confirmação e acesso** | Botão "Exportar meus dados" → JSON completo | Imediato (geração automática) |
| **Correção** | Formulário de edição de perfil | Imediato |
| **Anonimização** | Solicitação via formulário → processada pelo DPO | 15 dias úteis |
| **Portabilidade** | Exportação em JSON/CSV estruturado | Imediato |
| **Eliminação** | Solicitação via e-mail ao DPO → anonimização | 15 dias úteis |
| **Informação sobre compartilhamento** | Página de política de privacidade | — |
| **Revogação de consentimento** | Toggle na área de comunicações | Imediato |
| **Oposição** | Solicitação via e-mail ao DPO | 15 dias úteis |

### 5.2 Anonimização vs. Exclusão

Para dados vinculados a registros de obra (diários, atividades, logs), a exclusão completa comprometeria a integridade dos registros históricos. O processo adotado é **anonimização**:

```
Antes: { name: "João Silva", email: "joao@empresa.com" }
Depois: { name: "[Usuário Removido]", email: "anonimizado@removed.invalid" }
```

Os registros de diário e auditoria são preservados; o vínculo pessoal é quebrado.

### 5.3 Fluxo de Solicitação

```
Titular → Formulário no app ou e-mail para DPO
    ↓
DPO verifica identidade (autenticação + confirmação por e-mail)
    ↓
DPO executa procedimento via painel SUPER_ADMIN
    ↓
Confirmação enviada ao titular com protocolo
    ↓
Registro de atendimento em AuditLog
```

---

## 6. Privacy by Design e Privacy by Default

### 6.1 Privacy by Design (7 Princípios — Ann Cavoukian)

| Princípio | Como aplicado no sistema |
|---|---|
| Proativo, não reativo | Modelagem de dados desde o início sem campos desnecessários |
| Privacy como padrão | CLIENTE_SINDICO vê apenas diários aprovados; fotos de rascunho são privadas |
| Privacy embutida no design | companyId em todas as tabelas; tenant guard no middleware |
| Funcionalidade total | Segurança e funcionalidade não são trade-offs |
| Segurança fim-a-fim | TLS + encryption at rest + bcrypt + JWT HttpOnly |
| Visibilidade e transparência | Política de privacidade acessível; logs auditáveis pelo admin |
| Respeito pela privacidade do usuário | Exportação e solicitação de remoção disponíveis no app |

### 6.2 Privacy by Default — Configurações Padrão

- Fotos são **privadas por padrão** (bucket privado + URL pré-assinada)
- Diários são visíveis ao CLIENTE_SINDICO **somente após aprovação**
- Notificações por e-mail de marketing: **opt-in** (desmarcado por padrão)
- Dados de localização de fotos (EXIF GPS): **stripping automático** antes de servir publicamente
- Avatar do usuário: **não obrigatório**, sem padrão que identifique o usuário

---

## 7. Boas Práticas para Produção

### 7.1 Gerenciamento de Segredos

```bash
# NUNCA commitar no repositório:
DATABASE_URL
NEXTAUTH_SECRET
AWS_SECRET_ACCESS_KEY
R2_SECRET_ACCESS_KEY
RESEND_API_KEY

# Use:
# - Railway / Render: variáveis de ambiente no painel
# - AWS: Secrets Manager ou Parameter Store
# - Local: .env.local (no .gitignore)
```

### 7.2 Rotação de Credenciais

| Credencial | Frequência de Rotação |
|---|---|
| NEXTAUTH_SECRET | A cada 6 meses ou após incidente |
| Database password | A cada 6 meses |
| R2/S3 access keys | A cada 3 meses (ou usar IAM Role) |
| Resend API key | A cada 6 meses |
| Tokens de serviço interno | A cada 90 dias |

### 7.3 Firewall e Rede

- Banco de dados **não deve ter IP público**; acessível apenas via rede privada do provedor
- Redis **não deve ter IP público**
- Regras de firewall: apenas porta 443 acessível externamente
- Whitelist de IPs para acesso ao painel de banco de dados em produção

### 7.4 Dependency Security

```bash
# Executar em cada PR e semanalmente
npm audit --audit-level=high

# Configurar no package.json
"scripts": {
  "audit": "npm audit --audit-level=moderate",
  "audit:fix": "npm audit fix"
}
```

### 7.5 Política de Senhas

- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula, 1 número
- Verificação contra lista de senhas comuns (HaveIBeenPwned API — hash parcial)
- Sem limite máximo de caracteres (suporte a passphrase)

---

## 8. OWASP ASVS — Mapeamento

Referência: [OWASP Application Security Verification Standard 4.0](https://owasp.org/www-project-application-security-verification-standard/)

### Nível Alvo: ASVS Level 2

| ASVS Item | Descrição | Status no MVP |
|---|---|---|
| V1.1 | Ciclo de vida de desenvolvimento seguro | ✅ Code review + CI |
| V2.1 | Segurança de senhas (bcrypt, min 8 chars) | ✅ Implementado |
| V2.2 | Autenticação geral (sem credenciais padrão) | ✅ Implementado |
| V2.5 | Recuperação de credenciais (link expirado) | ✅ TTL 1h |
| V3.1 | Gerenciamento de sessão (HttpOnly, Secure) | ✅ NextAuth |
| V3.3 | Logout e expiração de sessão | ✅ TTL 7 dias + logout |
| V4.1 | Controle de acesso geral (deny by default) | ✅ Middleware |
| V4.2 | Controle de acesso a nível de operação | ✅ Funções can() |
| V5.1 | Validação de inputs (Zod) | ✅ Implementado |
| V5.3 | Sanitização de output (React escapa por padrão) | ✅ React |
| V6.2 | Algoritmos criptográficos seguros | ✅ bcrypt, AES-256 |
| V7.1 | Logs de segurança | ✅ AuditLog |
| V7.3 | Proteção de logs | 🔶 Planejado |
| V9.1 | TLS obrigatório | ✅ HTTPS obrigatório |
| V13.1 | Segurança de API REST | ✅ JWT + RBAC |
| V14.4 | HTTP Security Headers | ✅ next.config.ts |

---

## 9. Plano de Resposta a Incidentes

### 9.1 Classificação de Incidentes

| Severidade | Descrição | Exemplo |
|---|---|---|
| **P1 — Crítico** | Dados expostos, sistema comprometido | Vazamento de banco, acesso não autorizado |
| **P2 — Alto** | Funcionalidade crítica indisponível | Falha de autenticação, banco inacessível |
| **P3 — Médio** | Degradação de performance ou funcionalidade | API lenta, falha em módulo secundário |
| **P4 — Baixo** | Bug menor, problema pontual | Erro de validação, UI incorreta |

### 9.2 Processo de Resposta

```
DETECÇÃO (Sentry / alertas / usuário)
    │
    ▼ (< 15 min)
TRIAGEM — Classificar severidade, envolver responsável
    │
    ▼ (P1: < 30 min | P2: < 2h)
CONTENÇÃO — Isolar sistema afetado, revogar credenciais comprometidas
    │
    ▼
INVESTIGAÇÃO — Analisar logs, identificar causa raiz
    │
    ▼
REMEDIAÇÃO — Corrigir, aplicar patch, restaurar backup se necessário
    │
    ▼
NOTIFICAÇÃO — Comunicar clientes afetados (se P1/P2 com vazamento de dados)
    │
    ▼ (se vazamento de dados pessoais)
ANPD — Notificar ANPD em até 72 horas (LGPD Art. 48)
    │
    ▼
PÓS-INCIDENTE — Relatório, lições aprendidas, atualização de controles
```

### 9.3 Obrigação de Notificação LGPD

Conforme **LGPD Art. 48**, incidentes com dados pessoais que possam causar risco ou dano relevante aos titulares devem ser comunicados à **ANPD** e aos titulares afetados em prazo razoável (regulamentado como 72 horas pela ANPD).

### 9.4 Contatos de Emergência

Definir e documentar (fora deste arquivo):
- Contato do DPO
- Contato do CTO / responsável técnico
- Contato do provedor de hospedagem (suporte de incidente)
- Contato jurídico para notificação ANPD

---

## 10. Mapeamento Completo de Dados Pessoais Tratados

### ROPA — Record of Processing Activities (Art. 37 LGPD)

| # | Atividade | Dado Pessoal | Categoria | Titular | Finalidade | Base Legal | Retenção | Compartilhamento |
|---|---|---|---|---|---|---|---|---|
| 1 | Cadastro de usuário | Nome, e-mail | Identificação | Usuário | Autenticação | Contrato | 5 anos | Não |
| 2 | Autenticação | E-mail, senha (hash) | Identificação | Usuário | Segurança | Contrato | 5 anos | Não |
| 3 | Recuperação de senha | E-mail | Identificação | Usuário | Suporte ao usuário | Contrato | 72h (token) | Não |
| 4 | Convite de usuário | E-mail | Identificação | Convidado | Onboarding | Contrato | 72h (token) | Não |
| 5 | Logs de auditoria | IP, user agent, userId | Comportamental | Usuário | Segurança / rastreabilidade | Legítimo interesse | 5 anos | Não |
| 6 | Registro de mão de obra | Função, empresa | Profissional | Colaborador de obra | RDO | Contrato | 5 anos | Não (cliente da empresa) |
| 7 | Upload de fotos | GPS metadata (EXIF) | Localização | Usuário (uploader) | Evidência documental | Contrato | 5 anos | Apenas via URL pré-assinada |
| 8 | Portal do cliente | Nome, e-mail | Identificação | Síndico / cliente | Acesso ao portal | Contrato | 5 anos | Não |
| 9 | E-mails transacionais | Nome, e-mail | Identificação | Usuário | Comunicação | Contrato | Não armazenado | Resend (processador) |
| 10 | Monitoramento de erros | Stack trace (pode conter dados) | Técnico | Usuário | Qualidade do serviço | Legítimo interesse | 90 dias | Sentry (processador) |

### Processadores de Dados (Sub-operadores)

| Processador | Dado Compartilhado | Finalidade | DPA Assinado? |
|---|---|---|---|
| Railway / Render | Todos os dados do banco | Hospedagem | Verificar no contrato |
| Cloudflare R2 | Arquivos, fotos | Object storage | Verificar no contrato |
| Resend | Nome, e-mail | Envio de e-mails | DPA disponível |
| Sentry | Logs de erro | Monitoramento | DPA disponível |

> **Importante:** Verificar e assinar DPA com todos os processadores antes do go-live em produção.
